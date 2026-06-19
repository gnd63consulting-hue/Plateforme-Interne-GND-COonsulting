-- =============================================
-- 0036_design_references.sql  (GND CRM — bibliotheque d'inspiration du Studio)
-- design_references : ce dont Metis (cahier des charges) et Dedale (build)
-- s'inspirent pour piocher des composants / patterns. Sites GND (repo GitHub)
-- + references externes haut de gamme. Admin gere ; agent_studio lit + enrichit.
-- 100% idempotent. A executer manuellement en Supabase.
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.design_references (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'external_ref' CHECK (kind IN ('gnd_site','external_ref')),
  url         TEXT,                 -- URL live de reference
  repo_url    TEXT,                 -- repo GitHub (sites GND : pour piocher des composants)
  sector      TEXT,
  tags        TEXT[],
  notes       TEXT,                 -- ce qu'on en retient (composants, style, animations)
  created_by  TEXT NOT NULL DEFAULT current_user,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS design_references_kind_idx ON public.design_references(kind);

DROP TRIGGER IF EXISTS design_references_updated_at ON public.design_references;
CREATE TRIGGER design_references_updated_at BEFORE UPDATE ON public.design_references
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Le Studio lit la bibliotheque (et peut l'enrichir : URLs/notes)
GRANT SELECT, INSERT, UPDATE ON public.design_references TO agent_studio;

ALTER TABLE public.design_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_references_admin_all" ON public.design_references;
CREATE POLICY "design_references_admin_all" ON public.design_references FOR ALL
  USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited());
DROP POLICY IF EXISTS "design_references_studio_select" ON public.design_references;
CREATE POLICY "design_references_studio_select" ON public.design_references FOR SELECT
  TO agent_studio USING (true);
DROP POLICY IF EXISTS "design_references_studio_write" ON public.design_references;
CREATE POLICY "design_references_studio_write" ON public.design_references FOR INSERT
  TO agent_studio WITH CHECK (true);
DROP POLICY IF EXISTS "design_references_studio_update" ON public.design_references;
CREATE POLICY "design_references_studio_update" ON public.design_references FOR UPDATE
  TO agent_studio USING (true) WITH CHECK (true);

-- Seed des sites GND connus (repo_url accessible aux agents via le token GitHub).
-- url (live) = a completer par Cyrus/Dedale.
INSERT INTO public.design_references (name, kind, repo_url, sector, notes) VALUES
 ('Chicken Drive (demo GND)','gnd_site','https://github.com/gnd63consulting-hue/chicken-drive','restauration / drive','Hero 3D scroll-scrub (theme Iron Man motard), color-shift menu, carte Leaflet, temoignages. Reference pour hero immersif + scroll premium.'),
 ('Hair Levallois (demo GND)','gnd_site','https://github.com/gnd63consulting-hue/hair-levallois','coiffure / salon','Salon premium, Next.js App Router minimal. Base technique du pattern de build Dedale.'),
 ('O Papa Poulet (demo GND)','gnd_site','https://github.com/gnd63consulting-hue/OPAPAPoulet-Marly-la-ville','restauration / snack','Site vitrine snack. Reference resto/snack one-page.'),
 ('Faim de Semaine (demo GND)','gnd_site','https://github.com/gnd63consulting-hue/Faim-de-Semaine-Website-V2','restauration / brunch','Site brunch Next.js. Reference resto editorial.'),
 ('Portfolio GND','gnd_site','https://github.com/gnd63consulting-hue/Site-Portfolio-GND-consulting','agence / portfolio','Portfolio GND. Reference de composants/sections agence.')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION
SELECT has_table_privilege('agent_studio','public.design_references','SELECT') AS studio_read_ok;
SELECT count(*) AS refs FROM public.design_references;
