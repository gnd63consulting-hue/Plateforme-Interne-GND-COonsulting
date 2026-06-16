-- =============================================
-- 0025_agents_cloisonnement.sql  (GND CRM — socle armée commerciale Hermès)
-- =============================================
-- Cloisonnement DB des agents IA externes (VPS Hostinger / Hermès).
--   Tables : agents (registry dashboard) · prospect_intel · prospect_draft
--   Vues scopées : v_agent_prospects · v_agent_pipeline  (JAMAIS deal_amount)
--   Rôles Postgres agent_* (connexion DIRECTE, jamais le service_role key)
--   GRANTs least-privilege + RLS double (admin PostgREST + agents directs)
--
-- SÉCURITÉ (3 couches) :
--   1. deal_amount isolé dans prospect_finance (0021), hors de portée des agents.
--   2. Agents = AUCUN grant sur prospects brut → passent par les vues (liste de
--      colonnes explicite, security_invoker OFF = la vue tourne en owner admin).
--   3. REVOKE ALL explicite sur prospect_finance + prospects pour chaque agent_*.
--
-- CORRECTIF RLS : les agents se connectent en direct Postgres (auth.uid()=NULL),
--   donc is_admin_or_limited()=false. Sans policy dédiée, RLS bloquerait les
--   GRANTs. → policies scopées TO agent_* (permissives ligne, FOR <action> strict
--   aligné sur le GRANT). Le "quelle opération" = porté par les GRANTs.
--
-- ADDITIF · 100% idempotent · à exécuter MANUELLEMENT dans le Supabase SQL editor.
-- Rôles créés NOLOGIN : le LOGIN+password de chaque agent est posé hors-migration
-- (ALTER ROLE … WITH LOGIN PASSWORD '…') et stocké au coffre ~/GND-Coffre-Fort/.
-- =============================================

BEGIN;

-- 0. Fonction trigger updated_at (existe depuis 0001 ; CREATE OR REPLACE pour
--    rendre 0025 auto-suffisante).
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 1. Rôles agents (NOLOGIN ici ; NOINHERIT = pas d'escalade par appartenance).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_enrichisseur') THEN CREATE ROLE agent_enrichisseur NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_redacteur')    THEN CREATE ROLE agent_redacteur    NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_analytics')    THEN CREATE ROLE agent_analytics    NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_orchestrator') THEN CREATE ROLE agent_orchestrator NOLOGIN NOINHERIT; END IF;
END $$;

-- 2. Table agents (registry riche pour le dashboard "armée commerciale").
CREATE TABLE IF NOT EXISTS public.agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codename            TEXT NOT NULL UNIQUE,
  role                TEXT,
  mission             TEXT,
  kpi                 TEXT,
  model               TEXT,
  status              TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','paused','error')),
  db_role             TEXT,
  telegram_bot_handle TEXT,
  scope_note          TEXT,
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.agents IS 'Registry des agents IA (Hermès). Admin-only. db_role = rôle Postgres scopé de connexion. Cf. 0025.';

DROP TRIGGER IF EXISTS agents_updated_at ON public.agents;
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Table prospect_intel (enrichissement / signaux / arguments — zéro financier).
CREATE TABLE IF NOT EXISTS public.prospect_intel (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  intel_type  TEXT NOT NULL DEFAULT 'enrichment' CHECK (intel_type IN ('enrichment','signal','argument')),
  source      TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by  TEXT NOT NULL DEFAULT current_user,   -- attribution fiable (rôle PG, non spoofable)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospect_intel_prospect_id_idx ON public.prospect_intel(prospect_id);

DROP TRIGGER IF EXISTS prospect_intel_updated_at ON public.prospect_intel;
CREATE TRIGGER prospect_intel_updated_at BEFORE UPDATE ON public.prospect_intel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Table prospect_draft (brouillons de séquences, en attente de validation humaine).
CREATE TABLE IF NOT EXISTS public.prospect_draft (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id         UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','linkedin','sms')),
  subject             TEXT,
  body                TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','sent','discarded')),
  lemlist_campaign_id TEXT,
  created_by          TEXT NOT NULL DEFAULT current_user,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospect_draft_prospect_id_idx ON public.prospect_draft(prospect_id);
CREATE INDEX IF NOT EXISTS prospect_draft_status_idx ON public.prospect_draft(status, updated_at DESC);

DROP TRIGGER IF EXISTS prospect_draft_updated_at ON public.prospect_draft;
CREATE TRIGGER prospect_draft_updated_at BEFORE UPDATE ON public.prospect_draft
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Vues scopées — colonnes COMMERCIALES seulement (liste explicite, zéro financier).
CREATE OR REPLACE VIEW public.v_agent_prospects AS
SELECT
  p.id,
  p.nom_entreprise,
  p.nom,
  p.prenom_contact,
  p.role_contact,
  p.email,
  p.telephone,
  p.ville,
  p.statut,        -- "stage" du pipeline GND
  p.pipeline_id,
  p.user_id,       -- commercial assigné
  p.created_at,
  p.updated_at
FROM public.prospects p;
COMMENT ON VIEW public.v_agent_prospects IS 'Surface agents : colonnes commerciales de prospects. AUCUN deal_amount/finance. security_invoker OFF. Cf. 0025.';

CREATE OR REPLACE VIEW public.v_agent_pipeline AS
SELECT pl.id, pl.name FROM public.pipelines pl;
COMMENT ON VIEW public.v_agent_pipeline IS 'Surface agents : id+nom des pipelines. Cf. 0025.';

REVOKE ALL ON public.v_agent_prospects FROM PUBLIC;
REVOKE ALL ON public.v_agent_pipeline  FROM PUBLIC;

-- 6. GRANTs least-privilege.
GRANT USAGE ON SCHEMA public TO agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator;

GRANT SELECT ON public.v_agent_prospects TO agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator;
GRANT SELECT ON public.v_agent_pipeline  TO agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator;

GRANT SELECT, INSERT ON public.prospect_intel TO agent_enrichisseur;
GRANT SELECT          ON public.prospect_intel TO agent_redacteur, agent_analytics, agent_orchestrator;

GRANT SELECT                 ON public.prospect_draft TO agent_analytics, agent_orchestrator;
GRANT SELECT, INSERT, UPDATE ON public.prospect_draft TO agent_redacteur;

GRANT SELECT          ON public.agents TO agent_orchestrator;
GRANT UPDATE (status) ON public.agents TO agent_orchestrator;   -- restriction colonne = par le GRANT

-- 6.b Défense en profondeur : aucun agent ne touche le financier ni prospects brut.
REVOKE ALL ON public.prospect_finance FROM agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator;
REVOKE ALL ON public.prospects        FROM agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator;

-- 7. RLS.
ALTER TABLE public.agents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_draft ENABLE ROW LEVEL SECURITY;

-- 7.a Policies admin (path PostgREST/Next.js).
DROP POLICY IF EXISTS "agents_admin_all" ON public.agents;
CREATE POLICY "agents_admin_all" ON public.agents FOR ALL
  USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited());
DROP POLICY IF EXISTS "prospect_intel_admin_all" ON public.prospect_intel;
CREATE POLICY "prospect_intel_admin_all" ON public.prospect_intel FOR ALL
  USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited());
DROP POLICY IF EXISTS "prospect_draft_admin_all" ON public.prospect_draft;
CREATE POLICY "prospect_draft_admin_all" ON public.prospect_draft FOR ALL
  USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited());

-- 7.b Policies agents (path direct ; permissives ligne, FOR strict).
DROP POLICY IF EXISTS "prospect_intel_agents_select" ON public.prospect_intel;
CREATE POLICY "prospect_intel_agents_select" ON public.prospect_intel FOR SELECT
  TO agent_enrichisseur, agent_redacteur, agent_analytics, agent_orchestrator USING (true);
DROP POLICY IF EXISTS "prospect_intel_enrichisseur_insert" ON public.prospect_intel;
CREATE POLICY "prospect_intel_enrichisseur_insert" ON public.prospect_intel FOR INSERT
  TO agent_enrichisseur WITH CHECK (true);

DROP POLICY IF EXISTS "prospect_draft_agents_select" ON public.prospect_draft;
CREATE POLICY "prospect_draft_agents_select" ON public.prospect_draft FOR SELECT
  TO agent_redacteur, agent_analytics, agent_orchestrator USING (true);
DROP POLICY IF EXISTS "prospect_draft_redacteur_insert" ON public.prospect_draft;
CREATE POLICY "prospect_draft_redacteur_insert" ON public.prospect_draft FOR INSERT
  TO agent_redacteur WITH CHECK (true);
DROP POLICY IF EXISTS "prospect_draft_redacteur_update" ON public.prospect_draft;
CREATE POLICY "prospect_draft_redacteur_update" ON public.prospect_draft FOR UPDATE
  TO agent_redacteur USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "agents_orchestrator_select" ON public.agents;
CREATE POLICY "agents_orchestrator_select" ON public.agents FOR SELECT
  TO agent_orchestrator USING (true);
DROP POLICY IF EXISTS "agents_orchestrator_update" ON public.agents;
CREATE POLICY "agents_orchestrator_update" ON public.agents FOR UPDATE
  TO agent_orchestrator USING (true) WITH CHECK (true);

-- 8. Seed des 5 agents Phase 1 (Registry).
INSERT INTO public.agents (codename, role, mission, kpi, model, db_role, scope_note) VALUES
 ('Cyrus','Orchestrateur','Coordonne l''armée, dispatche les tâches, supervise le statut des agents.','Fiches a_contacter -> contacte','claude-opus','agent_orchestrator','Lecture vues+intel+draft ; UPDATE agents.status. Aveugle au CA.'),
 ('Atlas','BDR / Enrichissement','Enrichit les fiches (société, contacts, signaux).','Fiches enrichies / jour','claude-sonnet','agent_enrichisseur','Lecture vues + INSERT prospect_intel. Aucun accès prospects brut/finance.'),
 ('Nyx','SDR / Rédaction','Rédige les séquences d''approche personnalisées.','Brouillons validés / envoyés','claude-sonnet','agent_redacteur','Lecture vues+intel ; INSERT/UPDATE prospect_draft. Aveugle au CA.'),
 ('Dante','Sales Enablement','Produit arguments, objections, supports pour les commerciaux humains.','Arguments produits / fiche','claude-sonnet','agent_enrichisseur','Partage agent_enrichisseur (lecture vues + INSERT intel type argument).'),
 ('Pythie','Analytics','Analyse le funnel, produit le reporting de conversion.','Rapports funnel / semaine','claude-sonnet','agent_analytics','Lecture SEULE vues+intel+draft. Aucun accès écriture ni finance.')
ON CONFLICT (codename) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
