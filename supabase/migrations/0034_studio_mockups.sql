-- =============================================
-- 0034_studio_mockups.sql  (GND CRM — Studio Phase 2 : maquettes Dedale)
-- Table site_mockups : la maquette HTML one-page generee par Dedale a partir
-- d'un site_brief. Le HTML vit en base ; le CRM le sert a /m/<slug> (route
-- publique server-side, aucune cle de deploiement externe). 100% idempotent.
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.site_mockups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  brief_id    UUID REFERENCES public.site_brief(id) ON DELETE SET NULL,
  slug        TEXT NOT NULL UNIQUE,
  sector      TEXT,
  title       TEXT,
  html        TEXT,                                  -- le fichier maquette complet
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  preview_url TEXT,
  created_by  TEXT NOT NULL DEFAULT current_user,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_mockups_prospect_id_idx ON public.site_mockups(prospect_id);
CREATE INDEX IF NOT EXISTS site_mockups_status_idx ON public.site_mockups(status, updated_at DESC);

DROP TRIGGER IF EXISTS site_mockups_updated_at ON public.site_mockups;
CREATE TRIGGER site_mockups_updated_at BEFORE UPDATE ON public.site_mockups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- GRANTs : le Studio (Metis+Dedale via agent_studio) ecrit les maquettes
GRANT SELECT, INSERT, UPDATE ON public.site_mockups TO agent_studio;

-- RLS : admin plein pouvoir ; agent_studio ecrit. La lecture publique de /m/<slug>
-- se fait cote CRM en server-side (pas de policy anon ici = table verrouillee).
ALTER TABLE public.site_mockups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_mockups_admin_all" ON public.site_mockups;
CREATE POLICY "site_mockups_admin_all" ON public.site_mockups FOR ALL
  USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited());

DROP POLICY IF EXISTS "site_mockups_studio_select" ON public.site_mockups;
CREATE POLICY "site_mockups_studio_select" ON public.site_mockups FOR SELECT
  TO agent_studio USING (true);
DROP POLICY IF EXISTS "site_mockups_studio_insert" ON public.site_mockups;
CREATE POLICY "site_mockups_studio_insert" ON public.site_mockups FOR INSERT
  TO agent_studio WITH CHECK (true);
DROP POLICY IF EXISTS "site_mockups_studio_update" ON public.site_mockups;
CREATE POLICY "site_mockups_studio_update" ON public.site_mockups FOR UPDATE
  TO agent_studio USING (true) WITH CHECK (true);

-- Dedale branche sur le role Studio
UPDATE public.agents
SET db_role = 'agent_studio'
WHERE codename = 'Dedale' AND db_role IS DISTINCT FROM 'agent_studio';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION
SELECT 'studio INSERT mockups (true)' AS chk, has_table_privilege('agent_studio','public.site_mockups','INSERT') AS got, true AS exp
UNION ALL SELECT 'studio finance SELECT (false)', has_table_privilege('agent_studio','public.prospect_finance','SELECT'), false;
SELECT codename, db_role FROM public.agents WHERE codename='Dedale';
