-- =============================================
-- 0026_agents_phase2.sql  (GND CRM — armée commerciale Hermès, Phase 2)
-- ADDITIF sur 0025. Nouveaux rôles agent_sender/agent_sales_ops/agent_devis
-- + seed registre des 12 agents phase 2/3. Cloisonnement préservé.
-- À exécuter MANUELLEMENT dans le Supabase SQL editor. 100% idempotent.
-- =============================================

BEGIN;

-- A. Nouveaux rôles (NOLOGIN NOINHERIT, si absents)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_sender')     THEN CREATE ROLE agent_sender     NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_sales_ops')  THEN CREATE ROLE agent_sales_ops  NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_devis')      THEN CREATE ROLE agent_devis      NOLOGIN NOINHERIT; END IF;
END $$;

COMMENT ON ROLE agent_devis IS
  'Placeholder Hermès-Devis (quote-to-cash). NOLOGIN sans grant : table facturation cloisonnée = migration ultérieure. Cf. 0026.';

-- B. GRANTs least-privilege
GRANT USAGE ON SCHEMA public TO agent_sender, agent_sales_ops;

-- agent_sender (Victor) : lecture surfaces + UPDATE scopé draft (ready->sent)
GRANT SELECT ON public.v_agent_prospects TO agent_sender;
GRANT SELECT ON public.v_agent_pipeline  TO agent_sender;
GRANT SELECT ON public.prospect_intel    TO agent_sender;
GRANT SELECT                               ON public.prospect_draft TO agent_sender;
GRANT UPDATE (status, lemlist_campaign_id) ON public.prospect_draft TO agent_sender;

-- agent_sales_ops (Hestia) : lecture surfaces + UPDATE routing prospects (3 colonnes)
GRANT SELECT ON public.v_agent_prospects TO agent_sales_ops;
GRANT SELECT ON public.v_agent_pipeline  TO agent_sales_ops;
GRANT SELECT ON public.prospect_intel    TO agent_sales_ops;
GRANT SELECT ON public.prospect_draft    TO agent_sales_ops;
GRANT UPDATE (assigned_to, pipeline_id, status) ON public.prospects TO agent_sales_ops;

-- Defense-in-depth : aucun nouveau rôle ne lit le financier
REVOKE ALL ON public.prospect_finance FROM agent_sender, agent_sales_ops, agent_devis;
REVOKE ALL ON public.prospects        FROM agent_sender, agent_devis;

-- C. RLS — policies dédiées pour les nouveaux rôles directs
DROP POLICY IF EXISTS "prospect_intel_sender_select" ON public.prospect_intel;
CREATE POLICY "prospect_intel_sender_select" ON public.prospect_intel FOR SELECT TO agent_sender USING (true);
DROP POLICY IF EXISTS "prospect_intel_salesops_select" ON public.prospect_intel;
CREATE POLICY "prospect_intel_salesops_select" ON public.prospect_intel FOR SELECT TO agent_sales_ops USING (true);

DROP POLICY IF EXISTS "prospect_draft_sender_select" ON public.prospect_draft;
CREATE POLICY "prospect_draft_sender_select" ON public.prospect_draft FOR SELECT TO agent_sender USING (true);
DROP POLICY IF EXISTS "prospect_draft_sender_update" ON public.prospect_draft;
CREATE POLICY "prospect_draft_sender_update" ON public.prospect_draft FOR UPDATE TO agent_sender USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prospect_draft_salesops_select" ON public.prospect_draft;
CREATE POLICY "prospect_draft_salesops_select" ON public.prospect_draft FOR SELECT TO agent_sales_ops USING (true);

DROP POLICY IF EXISTS "prospects_salesops_update" ON public.prospects;
CREATE POLICY "prospects_salesops_update" ON public.prospects FOR UPDATE TO agent_sales_ops USING (true) WITH CHECK (true);

-- D. Registre — seed des 12 agents phase 2/3
INSERT INTO public.agents (codename, role, mission, kpi, model, db_role, scope_note) VALUES
 ('Victor','Outreach / Envoi séquences','Envoie les drafts validés via Lemlist, pose lemlist_campaign_id, marque le draft ''sent''.','Emails envoyés / taux de délivrabilité','claude-sonnet','agent_sender','UPDATE prospect_draft status->sent. Jamais d''envoi non validé. Aveugle au CA.'),
 ('Milo','Relances / Follow-up','Rédige les séquences de relance (cadence multi-touch).','Réponses récupérées en relance (~42% des réponses)','claude-sonnet','agent_redacteur','Partage agent_redacteur. Aveugle au CA.'),
 ('Diane','Discovery / Prep RDV','Prépare le brief pré-RDV (SPIN) et le récap post-RDV.','RDV préparés','claude-sonnet','agent_enrichisseur','Lecture vues+intel ; INSERT prospect_intel. Aveugle au CA.'),
 ('Nestor','Devis / Proposition','Rédige la proposition/devis (SCQA, valeur>prix), n''envoie pas seul.','Propositions prêtes','claude-sonnet','agent_redacteur','Partage agent_redacteur ; rédige sans mentionner de prix non validé. Aveugle au CA.'),
 ('Hestia','Hygiène data / Sales Ops','Dédup, qualité CRM, routing/attribution (règle ingestion != attribution).','Doublons résiduels, fiches mal routées corrigées','claude-sonnet','agent_sales_ops','UPDATE routing (assigned_to/pipeline_id/status) uniquement. Aveugle au CA.'),
 ('Thémis','RevOps','Backbone process/SLA/lifecycle, lecture seule.','SLA respectés','claude-sonnet','agent_analytics','Lecture seule. Aveugle au CA.'),
 ('Sophia','Doyen Université / Knowledge curator','Maintient la base de connaissance des agents et agrège les apprentissages (boucle d''amélioration système).','Skills/curriculum mis à jour','claude-sonnet','agent_analytics','Lecture seule DB ; gère le RAG/skills hors DB. Aveugle au CA.'),
 ('Hermes-Delivery','Onboarding / Chef de projet','Pilote l''onboarding client post-vente.','--','claude-sonnet',NULL,'Profil enregistré ; connecteur DB = migration post-vente ultérieure.'),
 ('Hermes-Success','Customer Success','Suit la satisfaction et la rétention client.','--','claude-sonnet',NULL,'Profil enregistré ; connecteur DB = migration post-vente ultérieure.'),
 ('Hermes-Support','SAV / Support','Traite les demandes de support et SAV.','--','claude-sonnet',NULL,'Profil enregistré ; connecteur DB = migration post-vente ultérieure.'),
 ('Hermes-Expand','Account Mgmt / Upsell','Gère les comptes et détecte les opportunités d''upsell.','--','claude-sonnet',NULL,'Profil enregistré ; connecteur DB = migration post-vente ultérieure.'),
 ('Hermes-Devis','Quote-to-cash / Facturation','Chaîne devis->contrat->facture (conformité FR), cloisonnée.','--','claude-sonnet','agent_devis','Rôle créé ; table facturation cloisonnée = migration ultérieure.')
ON CONFLICT (codename) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- =============================================
-- VÉRIFICATION (à lancer après, hors transaction) — chaque got doit = expected
-- =============================================
SELECT 'sender draft UPDATE status' AS check, has_column_privilege('agent_sender','public.prospect_draft','status','UPDATE') AS got, true AS expected
UNION ALL SELECT 'sender draft UPDATE body (FALSE)', has_column_privilege('agent_sender','public.prospect_draft','body','UPDATE'), false
UNION ALL SELECT 'sender draft INSERT (FALSE)', has_table_privilege('agent_sender','public.prospect_draft','INSERT'), false
UNION ALL SELECT 'sender prospects SELECT (FALSE)', has_table_privilege('agent_sender','public.prospects','SELECT'), false
UNION ALL SELECT 'salesops prospects UPDATE assigned_to', has_column_privilege('agent_sales_ops','public.prospects','assigned_to','UPDATE'), true
UNION ALL SELECT 'salesops prospects UPDATE email (FALSE)', has_column_privilege('agent_sales_ops','public.prospects','email','UPDATE'), false
UNION ALL SELECT 'salesops prospects SELECT brut (FALSE)', has_table_privilege('agent_sales_ops','public.prospects','SELECT'), false
UNION ALL SELECT 'sender finance SELECT (FALSE)', has_table_privilege('agent_sender','public.prospect_finance','SELECT'), false
UNION ALL SELECT 'salesops finance SELECT (FALSE)', has_table_privilege('agent_sales_ops','public.prospect_finance','SELECT'), false
UNION ALL SELECT 'devis finance SELECT (FALSE)', has_table_privilege('agent_devis','public.prospect_finance','SELECT'), false;

SELECT codename, role, db_role FROM public.agents ORDER BY (db_role IS NULL), codename;
