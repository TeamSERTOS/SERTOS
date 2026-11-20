
-- ==========================================
-- SERTOS: USER PROFILES
-- ==========================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name TEXT NOT NULL,

    role TEXT NOT NULL CHECK (
        role IN ('driver', 'traffic_police', 'hospital')
    ),

    phone TEXT UNIQUE,

    avatar_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ==========================================
-- SERTOS: AMBULANCES
-- ==========================================

CREATE TABLE public.ambulances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ambulance_number TEXT NOT NULL UNIQUE,

    registration_number TEXT NOT NULL UNIQUE,

    vehicle_model TEXT,

    status TEXT NOT NULL DEFAULT 'available'
        CHECK (
            status IN (
                'available',
                'on_duty',
                'maintenance',
                'inactive'
            )
        ),

    assigned_driver_id UUID REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

-- Drivers can view their assigned ambulance
CREATE POLICY "Drivers can view assigned ambulance"
ON public.ambulances
FOR SELECT
TO authenticated
USING (
    assigned_driver_id = (SELECT auth.uid())
);

-- Index for faster driver ambulance lookup
CREATE INDEX idx_ambulances_driver
ON public.ambulances(assigned_driver_id);

-- ==========================================
-- SERTOS: EMERGENCIES
-- ==========================================

CREATE TABLE public.emergencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    emergency_number TEXT NOT NULL UNIQUE,

    ambulance_id UUID NOT NULL
        REFERENCES public.ambulances(id),

    driver_id UUID NOT NULL
        REFERENCES public.profiles(id),

    hospital_id UUID
        REFERENCES public.profiles(id),

    patient_name TEXT,

    patient_age INTEGER CHECK (
        patient_age IS NULL OR patient_age BETWEEN 0 AND 120
    ),

    patient_gender TEXT,

    pickup_address TEXT,

    destination_address TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'hospital_assigned',
                'in_transit',
                'completed',
                'cancelled'
            )
        ),

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own emergencies
CREATE POLICY "Drivers can view own emergencies"
ON public.emergencies
FOR SELECT
TO authenticated
USING (
    driver_id = (SELECT auth.uid())
);

-- Hospitals can view emergencies assigned to them
CREATE POLICY "Hospitals can view assigned emergencies"
ON public.emergencies
FOR SELECT
TO authenticated
USING (
    hospital_id = (SELECT auth.uid())
);

-- Indexes
CREATE INDEX idx_emergencies_driver
ON public.emergencies(driver_id);

CREATE INDEX idx_emergencies_ambulance
ON public.emergencies(ambulance_id);

CREATE INDEX idx_emergencies_hospital
ON public.emergencies(hospital_id);

CREATE INDEX idx_emergencies_status
ON public.emergencies(status);

-- ==========================================
-- SERTOS: PATIENT REPORTS
-- ==========================================

CREATE TABLE public.patient_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    emergency_id UUID NOT NULL
        REFERENCES public.emergencies(id)
        ON DELETE CASCADE,

    reported_by UUID NOT NULL
        REFERENCES public.profiles(id),

    transcript TEXT,

    patient_condition TEXT,

    symptoms TEXT[],

    consciousness_level TEXT,

    breathing_status TEXT,

    ai_summary TEXT,

    ai_confidence NUMERIC(5,2)
        CHECK (
            ai_confidence IS NULL OR
            ai_confidence BETWEEN 0 AND 100
        ),

    reviewed_by_driver BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.patient_reports ENABLE ROW LEVEL SECURITY;

-- Drivers can view reports for their own emergencies
CREATE POLICY "Drivers can view own patient reports"
ON public.patient_reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.emergencies e
        WHERE e.id = patient_reports.emergency_id
        AND e.driver_id = (SELECT auth.uid())
    )
);

-- Hospitals can view reports for emergencies assigned to them
CREATE POLICY "Hospitals can view assigned patient reports"
ON public.patient_reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.emergencies e
        WHERE e.id = patient_reports.emergency_id
        AND e.hospital_id = (SELECT auth.uid())
    )
);

-- Index
CREATE INDEX idx_patient_reports_emergency
ON public.patient_reports(emergency_id);

-- ==========================================
-- SERTOS: AMBULANCE LOCATIONS
-- ==========================================

CREATE TABLE public.ambulance_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ambulance_id UUID NOT NULL
        REFERENCES public.ambulances(id)
        ON DELETE CASCADE,

    emergency_id UUID
        REFERENCES public.emergencies(id)
        ON DELETE SET NULL,

    latitude DOUBLE PRECISION NOT NULL
        CHECK (latitude BETWEEN -90 AND 90),

    longitude DOUBLE PRECISION NOT NULL
        CHECK (longitude BETWEEN -180 AND 180),

    speed DOUBLE PRECISION,

    heading DOUBLE PRECISION,

    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ambulance_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can view their ambulance location history
CREATE POLICY "Drivers can view own ambulance locations"
ON public.ambulance_locations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.ambulances a
        WHERE a.id = ambulance_locations.ambulance_id
        AND a.assigned_driver_id = (SELECT auth.uid())
    )
);

-- Hospitals can view locations of ambulances bringing patients to them
CREATE POLICY "Hospitals can view assigned ambulance locations"
ON public.ambulance_locations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.emergencies e
        WHERE e.id = ambulance_locations.emergency_id
        AND e.hospital_id = (SELECT auth.uid())
    )
);

CREATE INDEX idx_ambulance_locations_ambulance_time
ON public.ambulance_locations(ambulance_id, recorded_at DESC);

CREATE INDEX idx_ambulance_locations_emergency
ON public.ambulance_locations(emergency_id);
