-- =============================================
-- 0010_purge_test_user_and_totp.sql
-- =============================================
-- Plateforme Interne GND — Cleanup users + Préparation 2FA :
--   1. Purge user de test scaarythepluug@gmail.com (CASCADE)
--   2. Ajout colonnes TOTP sur users (totp_enabled, totp_required_at)
--
-- À exécuter APRÈS 0009.
-- ⚠️ DÉJÀ EXÉCUTÉ EN PROD le 3 mai 2026 ~01h30.
--    Ce fichier est commit pour cohérence repo ↔ prod.
-- =============================================

BEGIN;

-- -------- 1. Purge user test (CASCADE supprime tout ce qui lui est lié) --------
DELETE FROM auth.users WHERE email = 'scaarythepluug@gmail.com';

-- -------- 2. Add TOTP columns --------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_required_at TIMESTAMPTZ;

-- -------- 3. Force PostgREST schema reload --------
NOTIFY pgrst, 'reload schema';

COMMIT;
