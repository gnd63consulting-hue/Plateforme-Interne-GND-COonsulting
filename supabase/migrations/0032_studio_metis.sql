-- =============================================
-- 0032_studio_metis.sql  (GND CRM — Studio industrialisation, Phase 1 : Metis)
-- ADDITIF. Role agent_studio + vue de calibrage budget + table site_brief.
-- Cloisonnement (exception maitrisee, decision Roodny) : Metis voit les signaux
-- de CAPACITE budget (ca_estime/taille/employes/classification) pour calibrer
-- le cahier des charges a la grille tarifaire GND, mais JAMAIS deal_amount ni
-- commissions (le joyau reste scelle). 100% idempotent. A executer manuellement.
-- =============================================

BEGIN;

-- A. Role Studio
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agent_studio') THEN
    CREATE ROLE agent_studio NOLOGIN NOINHERIT;
  END IF;
END $$;
COMMENT ON ROLE agent_studio IS
  'Studio (Metis/Dedale). Lecture vues + signaux budget calibrage. Aucun acces deal_amount/commissions. Cf. 0032.';

-- B. Vue de calibrage budget — colonnes commerciales + signaux capacite.
--    EXCLUT deal_amount/commissions/stripe (jamais expose aux agents).
CREATE OR REPLACE VIEW public.v_agent_studio_prospects AS
SELECT
  p.id,
  p.company_name,
  p.contact_name,
  p.prenom_contact,
  p.role_contact,
  p.email,
  p.phone,
  p.website,
  p.sector,
  p.city,
  p.postal_code,
  p.status,
  p.pipeline_id,
  p.assigned_to,
  p.instagram,
  p.linkedin_contact,
  p.linkedin_entreprise,
  p.note_google,
  p.nombre_avis,
  p.taille_entreprise,
  p.nombre_employes,
  p.branche,
  p.classification,
  p.ca_estime,          -- signal de CAPACITE budget (PAS le deal signe)
  p.created_at,
  p.updated_at
FROM public.prospects p;
COMMENT ON VIEW public.v_agent_studio_prospects IS
  'Surface Studio : commercial + signaux capacite budget (ca_estime/taille/employes/classification) pour calibrer le cahier des charges. EXCLUT deal_amount/commissions/stripe. Cf. 0032.';

REVOKE ALL ON public.v_agent_studio_prospects FROM PUBLIC;

-- C. Table cahier des charges (Metis ecrit, Dedale lira en Phase 2)
CREATE TABLE IF NOT EXISTS public.site_brief (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  budget_tier TEXT,                                   -- S | M | L (calibrage)
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','built','discarded')),
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,     -- le cahier des charges (sections, composants, contenu, sources)
  created_by  TEXT NOT NULL DEFAULT current_user,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_brief_prospect_id_idx ON public.site_brief(prospect_id);
CREATE INDEX IF NOT EXISTS site_brief_status_idx ON public.site_brief(status, updated_at DESC);

DROP TRIGGER IF EXISTS site_brief_updated_at ON public.site_brief;
CREATE TRIGGER site_brief_updated_at BEFORE UPDATE ON public.site_brief
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- D. GRANTs least-privilege
GRANT USAGE ON SCHEMA public TO agent_studio;
GRANT SELECT ON public.v_agent_studio_prospects TO agent_studio;
GRANT SELECT ON public.v_agent_prospects        TO agent_studio;
GRANT SELECT ON public.v_agent_pipeline          TO agent_studio;
GRANT SELECT ON public.prospect_intel            TO agent_studio;
GRANT SELECT, INSERT, UPDATE ON public.site_brief TO agent_studio;

-- Defense-in-depth : aucun financier, jamais prospects brut
REVOKE ALL ON public.prospect_finance FROM agent_studio;
REVOKE ALL ON public.commissions      FROM agent_studio;
REVOKE ALL ON public.prospects        FROM agent_studio;

-- E. RLS
ALTER TABLE public.site_brief ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_brief_admin_all" ON public.site_brief;
CREATE POLICY "site_brief_admin_all" ON public.site_brief FOR ALL
  USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited());

DROP POLICY IF EXISTS "site_brief_studio_select" ON public.site_brief;
CREATE POLICY "site_brief_studio_select" ON public.site_brief FOR SELECT
  TO agent_studio USING (true);
DROP POLICY IF EXISTS "site_brief_studio_insert" ON public.site_brief;
CREATE POLICY "site_brief_studio_insert" ON public.site_brief FOR INSERT
  TO agent_studio WITH CHECK (true);
DROP POLICY IF EXISTS "site_brief_studio_update" ON public.site_brief;
CREATE POLICY "site_brief_studio_update" ON public.site_brief FOR UPDATE
  TO agent_studio USING (true) WITH CHECK (true);

-- F. Registre : seed Metis + Dedale (Dedale db_role pose en Phase 2)
INSERT INTO public.agents (codename, role, mission, kpi, model, db_role, scope_note) VALUES
 ('Metis','Studio / Chef de projet','Produit un cahier des charges calibre a la grille GND a partir du prospect enrichi + signal budget.','Cahiers des charges propres / prospect','gpt-5.4','agent_studio','Lecture vues + signaux budget (ca_estime/tier) ; INSERT site_brief. Aveugle au deal_amount/commissions.'),
 ('Dedale','Studio / Builder','Execute le cahier des charges : scrape le prospect, genere la maquette, deploie la preview.','Maquettes livrees / prospect','gpt-5.4',NULL,'Builder ; connecteur DB + outils en Phase 2. Aveugle au deal_amount/commissions.')
ON CONFLICT (codename) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================
-- VERIFICATION (hors transaction)
-- =============================================
SELECT 'studio voit la vue budget (true)' AS chk, has_table_privilege('agent_studio','public.v_agent_studio_prospects','SELECT') AS got, true AS exp
UNION ALL SELECT 'studio INSERT site_brief (true)', has_table_privilege('agent_studio','public.site_brief','INSERT'), true
UNION ALL SELECT 'studio SELECT prospects brut (false)', has_table_privilege('agent_studio','public.prospects','SELECT'), false
UNION ALL SELECT 'studio finance SELECT (false)', has_table_privilege('agent_studio','public.prospect_finance','SELECT'), false
UNION ALL SELECT 'studio commissions SELECT (false)', has_table_privilege('agent_studio','public.commissions','SELECT'), false;

SELECT codename, db_role FROM public.agents WHERE codename IN ('Metis','Dedale') ORDER BY codename;
