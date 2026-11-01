-- Vocalyzer — initial schema.
-- Idempotent: safe to run on a fresh Supabase project, and also on a project that already has the
-- ENT Quest tables (doctor_profiles / private.doctor_exists are created only if missing, with the
-- same shape ENT Quest uses).
--
-- Privacy model: audio is NEVER stored. Only numerical results (jsonb) are inserted, anonymously.

-- ---------------------------------------------------------------------------------------------
-- Doctor profiles (same columns as ENT Quest)
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  country TEXT,
  city TEXT,
  postal_code TEXT,
  license_number TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  terms_accepted_at TIMESTAMPTZ,
  professional_declaration_at TIMESTAMPTZ,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_profiles TO authenticated;
GRANT ALL ON public.doctor_profiles TO service_role;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctor_profiles' AND policyname = 'Users read own profile') THEN
    CREATE POLICY "Users read own profile" ON public.doctor_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctor_profiles' AND policyname = 'Users insert own profile') THEN
    CREATE POLICY "Users insert own profile" ON public.doctor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctor_profiles' AND policyname = 'Users update own profile') THEN
    CREATE POLICY "Users update own profile" ON public.doctor_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctor_profiles' AND policyname = 'Users delete own profile') THEN
    CREATE POLICY "Users delete own profile" ON public.doctor_profiles FOR DELETE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Helper: does a doctor (auth user) exist? Lives in a non-exposed schema so it is not callable
-- through the Data API; used by the anonymous INSERT policy below.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.doctor_exists(_doctor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _doctor_id)
$$;

REVOKE ALL ON FUNCTION private.doctor_exists(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.doctor_exists(uuid) TO anon;

-- ---------------------------------------------------------------------------------------------
-- The Data API roles need USAGE on the public schema. Granted explicitly so the migration also
-- works when the project was created with "Automatically expose new tables" disabled
-- (Supabase's recommended setting): every privilege below is granted explicitly.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Voice results (numerical only)
CREATE TABLE IF NOT EXISTS public.voice_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'doctor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  label text CHECK (label IS NULL OR char_length(label) <= 60),
  sex text NOT NULL DEFAULT 'unspecified' CHECK (sex IN ('male', 'female', 'unspecified')),
  age_group text NOT NULL DEFAULT 'unspecified' CHECK (age_group IN ('<18', '18-39', '40-59', '60+', 'unspecified')),
  language text NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  protocol_version text NOT NULL CHECK (char_length(protocol_version) BETWEEN 1 AND 40),
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object' AND octet_length(metrics::text) < 20000),
  estimates jsonb NOT NULL CHECK (jsonb_typeof(estimates) = 'object' AND octet_length(estimates::text) < 10000),
  clinician jsonb CHECK (clinician IS NULL OR (jsonb_typeof(clinician) = 'object' AND octet_length(clinician::text) < 10000))
);

CREATE INDEX IF NOT EXISTS voice_results_doctor_created_idx ON public.voice_results (doctor_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.voice_results TO authenticated;
GRANT INSERT ON public.voice_results TO anon;
-- Doctors may only change these columns (clinical numbers are immutable once stored).
REVOKE UPDATE ON public.voice_results FROM authenticated;
GRANT UPDATE (seen, label, clinician) ON public.voice_results TO authenticated;
GRANT ALL ON public.voice_results TO service_role;

ALTER TABLE public.voice_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anonymous patients can submit results" ON public.voice_results;
CREATE POLICY "Anonymous patients can submit results"
  ON public.voice_results
  FOR INSERT
  TO anon
  WITH CHECK (
    doctor_id IS NOT NULL
    AND private.doctor_exists(doctor_id)
    AND source = 'patient'
    AND seen = false
    AND label IS NULL
    AND clinician IS NULL
  );

DROP POLICY IF EXISTS "Doctors insert own results" ON public.voice_results;
CREATE POLICY "Doctors insert own results"
  ON public.voice_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors read own results" ON public.voice_results;
CREATE POLICY "Doctors read own results"
  ON public.voice_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors update own results" ON public.voice_results;
CREATE POLICY "Doctors update own results"
  ON public.voice_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors delete own results" ON public.voice_results;
CREATE POLICY "Doctors delete own results"
  ON public.voice_results
  FOR DELETE
  TO authenticated
  USING (auth.uid() = doctor_id);

-- Live inbox updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'voice_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_results;
  END IF;
END $$;
