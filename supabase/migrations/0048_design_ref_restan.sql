-- 0048_design_ref_restan.sql — Ajoute Restan (inspiration-25). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='Restan - Restaurant HTML';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Restan - Restaurant HTML','template',
  '/galerie/inspiration-25/source/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-25',
  '/inspiration/inspiration-25.png',
  'restaurant / fine-dining / light + dark',
  ARRAY['restaurant','food','dark-mode','reservation','multipage'],
  'Template Envato (HTML5 + Bootstrap, 53 pages). Light ET dark mode sur toutes les pages. 7 home variants (index, index-2 a index-6) x 2 modes = 14 versions home. Sous-pages : about, blog, chef, food-menu, shop, reservation, contact (clair+sombre). Apercu auto-heberge GND, placeholders comble theme resto.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
