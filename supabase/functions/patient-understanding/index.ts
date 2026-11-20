
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return jsonResponse(
        { error: "GEMINI_API_KEY is not configured" },
        500,
      );
    }

    const body = await req.json();
    const transcript = String(body.transcript ?? "").trim();

    if (!transcript) {
      return jsonResponse({ error: "Patient transcript is required" }, 400);
    }

    if (transcript.length > 5000) {
      return jsonResponse({ error: "Transcript is too long" }, 400);
    }

    const prompt = `
You are the patient-information extraction component of SERTOS,
an ambulance emergency coordination system.

Understand this driver's spoken patient report. It may contain Telugu,
English, or Telugu-English mixed language.

Extract only information explicitly stated in the transcript.
Do not invent missing details. Use null for unknown values.
Do not diagnose the patient or infer a disease.

Urgency must describe the urgency REPORTED by the driver:
"critical", "urgent", "stable", or "unknown".

Return JSON with exactly these fields:
{
  "patient_name": string | null,
  "age": number | null,
  "symptoms": string[],
  "reported_condition": string | null,
  "urgency": "critical" | "urgent" | "stable" | "unknown",
  "language": string,
  "missing_information": string[],
  "clinical_summary": string,
  "requires_human_confirmation": true
}

Keep the clinical summary concise. Preserve the meaning of the original
report. Never claim a diagnosis.

Driver's transcript:
${transcript}
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return jsonResponse({ error: "AI processing failed" }, 502);
    }

    const result = await geminiResponse.json();
    const responseText =
      result.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("") ?? "";

    if (!responseText) {
      return jsonResponse({ error: "AI returned an empty response" }, 502);
    }

    const patient = JSON.parse(responseText);

    const allowedUrgencies = ["critical", "urgent", "stable", "unknown"];

    if (!allowedUrgencies.includes(patient.urgency)) {
      patient.urgency = "unknown";
    }

    patient.requires_human_confirmation = true;

    return jsonResponse({
      success: true,
      patient,
      workflow_status: "awaiting_driver_confirmation",
    });
  } catch (error) {
    console.error("Patient understanding error:", error);

    return jsonResponse({
      error: "Unable to process patient report",
    }, 500);
  }
});
