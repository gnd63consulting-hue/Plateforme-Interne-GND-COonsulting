-- =============================================
-- 0033_studio_intel_read.sql  (GND CRM — fix Studio : Metis lit prospect_intel)
-- En 0032, agent_studio a le GRANT SELECT sur prospect_intel mais aucune policy
-- RLS le couvrant -> 0 ligne. On l'ajoute a la policy de lecture des agents.
-- Lecture seule. 100% idempotent. A executer manuellement en Supabase.
-- =============================================

BEGIN;

DROP POLICY IF EXISTS "prospect_intel_agents_select" ON public.prospect_intel;
CREATE POLICY "prospect_intel_agents_select" ON public.prospect_intel FOR SELECT
  TO agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator, agent_studio
  USING (true);

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION
SELECT has_table_privilege('agent_studio','public.prospect_intel','SELECT') AS studio_grant_ok;
-- (le grant doit etre true ; la policy ci-dessus rend les lignes visibles)
