-- =============================================
-- 0009_invitations_whitelist_admin_limited.sql
-- =============================================
-- Plateforme Interne GND — Sécurisation auth :
--   1. Table invitations (whitelist par email)
--   2. Rôle 'admin_limited' (Jean)
--   3. Helper is_admin_or_limited()
--   4. handle_new_user modifié pour bloquer les non-invités (RAISE EXCEPTION)
--   5. RLS mises à jour pour donner accès admin_limited (Jean voit tout)
--   6. Seed invitations consumed pour les 3 users à garder
--
-- Idempotent. Safe à re-runner.
-- ⚠️ DÉJÀ EXÉCUTÉ EN PROD le 3 mai 2026 ~01h30.
--    Ce fichier est commit pour cohérence repo ↔ prod.
-- =============================================

BEGIN;

-- -------- 1. Table invitations --------
CREATE TABLE IF NOT EXISTS public.invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('freelance', 'admin', 'admin_limited')),
  token       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS invitations_token_idx ON public.invitations(token);
CREATE INDEX IF NOT EXISTS invitations_pending_idx ON public.invitations(consumed_at) WHERE consumed_at IS NULL;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- -------- 2. Étendre users.role pour inclure admin_limited --------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('freelance', 'admin', 'admin_limited'));

-- -------- 3. Helper is_admin_or_limited() --------
CREATE OR REPLACE FUNCTION public.is_admin_or_limited()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'admin_limited')
  );
$$;

-- -------- 4. Seed invitations CONSUMED pour les users existants à garder --------
INSERT INTO public.invitations (email, role, expires_at, consumed_at)
VALUES 
  ('gnd63consulting@gmail.com', 'admin', now() + interval '10 years', now()),
  ('roodnyp@gmail.com', 'admin', now() + interval '10 years', now()),
  ('jeanbillardo.ulysse@gmail.com', 'admin_limited', now() + interval '10 years', now())
ON CONFLICT DO NOTHING;

UPDATE public.users SET role = 'admin' WHERE email = 'roodnyp@gmail.com';
UPDATE public.users SET role = 'admin_limited' WHERE email = 'jeanbillardo.ulysse@gmail.com';

-- -------- 5. Modifier handle_new_user pour whitelist strict --------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id UUID;
  v_role TEXT;
BEGIN
  SELECT id, role INTO v_invitation_id, v_role
  FROM public.invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND consumed_at IS NULL
    AND expires_at > now()
  ORDER BY invited_at DESC
  LIMIT 1;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Email % non autorisé. Une invitation valide est requise pour accéder à la plateforme.', NEW.email
      USING HINT = 'Contactez un administrateur pour obtenir une invitation.';
  END IF;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.invitations SET consumed_at = now() WHERE id = v_invitation_id;

  RETURN NEW;
END;
$$;

-- -------- 6. RLS Policies invitations --------
DROP POLICY IF EXISTS "invitations_admin_all" ON public.invitations;
CREATE POLICY "invitations_admin_all" ON public.invitations
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- -------- 7. Update RLS existantes : is_admin() → is_admin_or_limited() --------

-- users
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (public.is_admin_or_limited());

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.is_admin_or_limited()) 
  WITH CHECK (public.is_admin_or_limited());

-- progressions (drop le doublon owner_read au passage)
DROP POLICY IF EXISTS "progressions_owner_read" ON public.progressions;
DROP POLICY IF EXISTS "progressions_select_admin" ON public.progressions;
CREATE POLICY "progressions_select_admin" ON public.progressions
  FOR SELECT USING (public.is_admin_or_limited());
DROP POLICY IF EXISTS "progressions_update_admin" ON public.progressions;
CREATE POLICY "progressions_update_admin" ON public.progressions
  FOR UPDATE USING (public.is_admin_or_limited());

-- prospects (drop le doublon admin_read au passage)
DROP POLICY IF EXISTS "prospects_admin_read" ON public.prospects;
DROP POLICY IF EXISTS "prospects_select_admin" ON public.prospects;
CREATE POLICY "prospects_select_admin" ON public.prospects
  FOR SELECT USING (public.is_admin_or_limited());
DROP POLICY IF EXISTS "prospects_update_admin" ON public.prospects;
CREATE POLICY "prospects_update_admin" ON public.prospects
  FOR UPDATE USING (public.is_admin_or_limited()) 
  WITH CHECK (public.is_admin_or_limited());
DROP POLICY IF EXISTS "prospects_delete_admin" ON public.prospects;
CREATE POLICY "prospects_delete_admin" ON public.prospects
  FOR DELETE USING (public.is_admin_or_limited());

-- quiz_attempts
DROP POLICY IF EXISTS "quiz_attempts_read_admin" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_read_admin" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (public.is_admin_or_limited());

-- -------- 8. Force PostgREST schema reload --------
NOTIFY pgrst, 'reload schema';

COMMIT;
