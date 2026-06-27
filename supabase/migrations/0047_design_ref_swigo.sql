-- 0047_design_ref_swigo.sql — Ajoute Swigo (inspiration-24). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='Swigo - Food & Restaurant HTML';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Swigo - Food & Restaurant HTML','template',
  '/galerie/inspiration-24/xhtml/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-24',
  '/inspiration/inspiration-24.png',
  'restaurant / food / multi-page premium',
  ARRAY['restaurant','food','blog','shop','multipage'],
  'Template Envato premium (HTML5 + Bootstrap, 71 pages). 4 home variants (index, index-2/3/4), 5 menus, blog/shop/posts complets. Apercu auto-heberge GND, placeholders comble theme food. Convertir vers stack GND avant usage client.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
