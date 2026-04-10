-- =============================================
-- GND Formation Commerciaux - Initial schema
-- =============================================
-- Run this script in the Supabase SQL editor of
-- the dedicated project for this platform.
-- =============================================

-- -------- Table users --------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'commercial' CHECK (role IN ('commercial', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------- Table progressions --------
CREATE TABLE IF NOT EXISTS public.progressions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, module_slug)
);

-- -------- Table prospects --------
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  ville TEXT,
  statut TEXT NOT NULL DEFAULT 'a_contacter'
    CHECK (statut IN ('a_contacter','contacte','rdv_pris','devis_envoye','gagne','perdu')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospects_user_id_idx ON public.prospects(user_id);
CREATE INDEX IF NOT EXISTS prospects_updated_at_idx ON public.prospects(updated_at DESC);

-- -------- Trigger : create public.users on first OAuth sign-in --------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'commercial'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------- Trigger : auto-update updated_at on prospects --------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prospects_updated_at ON public.prospects;
CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- Row Level Security
-- =============================================

-- Helper: check if the current authenticated user is an admin.
-- SECURITY DEFINER so it bypasses RLS on public.users and avoids
-- recursive policy evaluation when used inside policies on that table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- -------- users policies --------
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_admin_read" ON public.users;
CREATE POLICY "users_admin_read" ON public.users
  FOR SELECT USING (public.is_admin());

-- -------- progressions policies --------
DROP POLICY IF EXISTS "progressions_owner_all" ON public.progressions;
CREATE POLICY "progressions_owner_all" ON public.progressions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "progressions_admin_read" ON public.progressions;
CREATE POLICY "progressions_admin_read" ON public.progressions
  FOR SELECT USING (public.is_admin());

-- -------- prospects policies --------
DROP POLICY IF EXISTS "prospects_owner_all" ON public.prospects;
CREATE POLICY "prospects_owner_all" ON public.prospects
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prospects_admin_read" ON public.prospects;
CREATE POLICY "prospects_admin_read" ON public.prospects
  FOR SELECT USING (public.is_admin());
