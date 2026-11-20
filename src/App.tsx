
import { useEffect, useState, type ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DriverPage from "./features/driver/DriverPage";
import LoginPage from "./features/auth/LoginPage";
import { supabase } from "./services/supabase";

type UserRole = "driver" | "traffic_police" | "hospital";

function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<
    "loading" | "allowed" | "denied"
  >("loading");

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (active) setStatus("denied");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (
        error ||
        !profile ||
        !profile.is_active ||
        profile.role !== role
      ) {
        setStatus("denied");
        return;
      }

      setStatus("allowed");
    };

    checkAccess();

    return () => {
      active = false;
    };
  }, [role]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Checking your account...
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RolePendingPage({ role }: { role: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold">SERTOS</h1>
        <p className="mt-3 text-slate-400">
          {role} dashboard will be implemented next.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/driver"
          element={
            <ProtectedRoute role="driver">
              <DriverPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/police"
          element={
            <ProtectedRoute role="traffic_police">
              <RolePendingPage role="Traffic Police" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hospital"
          element={
            <ProtectedRoute role="hospital">
              <RolePendingPage role="Hospital" />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
