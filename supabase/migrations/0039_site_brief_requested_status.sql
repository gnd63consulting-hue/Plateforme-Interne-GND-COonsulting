-- =============================================
-- 0039_site_brief_requested_status.sql  (GND CRM — Studio Phase 4)
-- ADDITIF. Etend le CHECK de status sur public.site_brief pour autoriser le
-- cycle pilote depuis le CRM : 'requested' (pose par le bouton "Generer une
-- maquette" de la fiche prospect) puis 'done' (pose par le watcher Studio une
-- fois la maquette produite). Les valeurs historiques 0032
-- (draft/ready/built/discarded) restent valides. 100% idempotent. A executer
-- manuellement.
-- =============================================

BEGIN;

ALTER TABLE public.site_brief DROP CONSTRAINT IF EXISTS site_brief_status_check;
ALTER TABLE public.site_brief
  ADD CONSTRAINT site_brief_status_check
  CHECK (status IN ('requested','done','draft','ready','built','discarded'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION
SELECT 'requested autorise' AS chk,
       EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'site_brief_status_check'
           AND pg_get_constraintdef(oid) LIKE '%requested%'
       ) AS got, true AS exp;
