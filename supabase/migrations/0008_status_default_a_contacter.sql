-- =============================================
-- GND Formation Commerciaux — Status default change
-- =============================================
-- 1. Default 'prospecte' → 'a_contacter' (the truthful "not yet contacted")
-- 2. Bulk update existing rows with the legacy default
--
-- Rationale: 'prospecte' is misleading. In French sales context, "prospecté"
-- means "déjà prospecté/contacté", not "présent dans le pipeline". The column
-- was actually used as the initial state. Switching to 'a_contacter' aligns
-- the label with reality.
--
-- Idempotent. Safe to re-run.
-- =============================================

-- Change column default for new INSERTs
ALTER TABLE public.prospects
  ALTER COLUMN status SET DEFAULT 'a_contacter';

-- Retag existing rows that still bear the legacy default
UPDATE public.prospects
SET status = 'a_contacter'
WHERE status = 'prospecte';

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Vérif post-migration
SELECT status, COUNT(*) AS nb
FROM public.prospects
GROUP BY status
ORDER BY nb DESC;
