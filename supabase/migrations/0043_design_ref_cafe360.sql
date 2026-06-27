-- 0043_design_ref_cafe360.sql
-- Ajoute Cafe360 (inspiration-21) a la bibliotheque design_references.
-- Apercu auto-heberge GND (servi depuis public/galerie). Idempotent.
-- A executer manuellement dans Supabase.
BEGIN;

INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Cafe360 - Restaurant & Cafe OnePage','template',
  '/galerie/inspiration-21/Cafe360-Restaurant-OnePage-HTML/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-21',
  '/inspiration/inspiration-21.png',
  'restaurant / cafe / one-page',
  ARRAY['restaurant','cafe','coffee','food','onepage'],
  'Template Envato complet (HTML5 + Bootstrap, multi-variantes : index, dark, fullmenu, slider, video). Apercu auto-heberge GND. Convertir vers le stack GND avant usage client.')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
