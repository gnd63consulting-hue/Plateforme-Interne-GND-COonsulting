-- 0051_design_ref_gixus.sql — Ajoute GIxus (inspiration-28, React). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='GIxus - Business Consulting React';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('GIxus - Business Consulting React','template',
  '/galerie/inspiration-28/dist/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-28',
  '/inspiration/inspiration-28.png',
  'business / consulting / marketing',
  ARRAY['react','business','consulting','marketing','multipage'],
  'Template React + Vite (source dans template-library/inspiration-28/source). Apercu = build statique self-heberge GND (base ./, HashRouter). Multi-pages. Placeholders comble theme business. Build : npm install --legacy-peer-deps && npm run build.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
