-- =============================================
-- 0030_cloisonnement_hardening.sql  (GND CRM — Hermes, defense-in-depth)
-- ADDITIF. Durcissement du cloisonnement financier suite a l'audit RLS.
-- Ne casse aucune ecriture normale (le payload atlas.fr_cascade.v1 ne contient
-- aucune cle financiere). 100% idempotent. A executer MANUELLEMENT en Supabase.
-- =============================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. agent_sales_ops (Hestia) : least-privilege EXPLICITE sur prospects
--    Il etait omis du REVOKE de 0026 (pas de fuite reelle car aucun GRANT
--    SELECT, mais hygiene defense-in-depth). On revoque tout puis on re-grant
--    uniquement les 3 colonnes de routing.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.prospects FROM agent_sales_ops;
GRANT UPDATE (assigned_to, pipeline_id, status) ON public.prospects TO agent_sales_ops;

-- ---------------------------------------------------------------------------
-- 2. Filet financier au niveau base sur prospect_intel
--    Le payload JSONB est libre et lu par les commerciaux (policy 0028). On
--    interdit a la base d'accepter une cle financiere dans ce payload, quelle
--    que soit la source (agent, bug, script). Le cloisonnement n'est plus
--    seulement une discipline d'agent : c'est une garantie Postgres.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_financial_keys_in_intel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Rejette si une cle financiere connue est presente au 1er niveau du JSONB.
  IF NEW.payload ?| ARRAY[
       'deal_amount','ca','ca_estime','chiffre_affaires','montant','commission',
       'commissions','revenue','prix','price','mrr','arr','marge'
     ] THEN
    RAISE EXCEPTION
      'Cloisonnement: prospect_intel.payload ne doit contenir aucune donnee financiere (cle interdite detectee).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_financial_keys_in_intel ON public.prospect_intel;
CREATE TRIGGER trg_reject_financial_keys_in_intel
  BEFORE INSERT OR UPDATE ON public.prospect_intel
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_financial_keys_in_intel();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================
-- VERIFICATION (hors transaction)
-- =============================================
-- a. agent_sales_ops : UPDATE routing OK, mais pas SELECT brut ni autre colonne
SELECT 'salesops UPDATE assigned_to (true)'  AS check,
       has_column_privilege('agent_sales_ops','public.prospects','assigned_to','UPDATE') AS got, true AS expected
UNION ALL SELECT 'salesops UPDATE email (false)',
       has_column_privilege('agent_sales_ops','public.prospects','email','UPDATE'), false
UNION ALL SELECT 'salesops SELECT prospects brut (false)',
       has_table_privilege('agent_sales_ops','public.prospects','SELECT'), false;

-- b. Le trigger existe bien
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.prospect_intel'::regclass
  AND tgname = 'trg_reject_financial_keys_in_intel';

-- c. (optionnel) test du filet — DOIT lever une exception, donc a lancer SEUL :
--    INSERT INTO public.prospect_intel (prospect_id, intel_type, source, payload, created_by)
--    SELECT id, 'enrichment', 'test.leak', '{"deal_amount": 9999}'::jsonb, 'postgres'
--    FROM public.prospects LIMIT 1;
--    -> attendu : ERROR Cloisonnement: ... cle interdite detectee.
