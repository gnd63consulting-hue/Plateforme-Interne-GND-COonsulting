-- 0045_design_ref_cafezone.sql — Ajoute CafeZone (inspiration-22). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='CafeZone - Cafe & Restaurant HTML';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('CafeZone - Cafe & Restaurant HTML','template',
  '/galerie/inspiration-22/xhtml/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-22',
  '/inspiration/inspiration-22.png',
  'restaurant / café / coffee shop',
  ARRAY['cafe','coffee','restaurant','bakery','donut'],
  'Template Envato complet (HTML5 + Bootstrap, Dexignlab). Apercu auto-heberge GND, hero comble theme cafe.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
