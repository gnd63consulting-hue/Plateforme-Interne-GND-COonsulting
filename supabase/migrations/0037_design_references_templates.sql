-- =============================================
-- 0037_design_references_templates.sql
-- design_references : support kind 'template' (templates Envato d'inspiration)
-- + colonne preview_url (aperçu servi par la plateforme) + seed inspiration-1.
-- Idempotent. A exécuter manuellement dans Supabase.
-- =============================================
BEGIN;

ALTER TABLE public.design_references DROP CONSTRAINT IF EXISTS design_references_kind_check;
ALTER TABLE public.design_references
  ADD CONSTRAINT design_references_kind_check CHECK (kind IN ('gnd_site','external_ref','template'));

ALTER TABLE public.design_references ADD COLUMN IF NOT EXISTS preview_url TEXT;

INSERT INTO public.design_references (name, kind, repo_url, preview_url, sector, tags, notes) VALUES
 ('Inspiration 1 - Corporate / Consulting','template',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-1',
  '/inspiration/inspiration-1.png',
  'corporate / consulting',
  ARRAY['corporate','consulting','services','shop','blog'],
  'Template Envato complet (origine bizzar v1.0, Bootstrap5 + jQuery, 22 pages). Inspiration : hero, pricing, team, services, blog, contact. Convertir vers le stack GND (Tailwind/React) avant usage client. Repo : gnd-template-library/inspiration-1.')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
