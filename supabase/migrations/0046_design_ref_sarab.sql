-- 0046_design_ref_sarab.sql — Ajoute Sarab (inspiration-23). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='Sarab - Fast Food Restaurant HTML';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Sarab - Fast Food Restaurant HTML','template',
  '/galerie/inspiration-23/sarab/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-23',
  '/inspiration/inspiration-23.png',
  'restauration / fast-food / burger',
  ARRAY['fast-food','burger','pizza','restaurant','food'],
  'Template Envato complet (HTML5 + Bootstrap). Apercu auto-heberge GND, hero+galerie comble theme fast-food.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
