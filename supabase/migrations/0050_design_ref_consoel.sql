-- 0050_design_ref_consoel.sql — Ajoute Consoel (inspiration-27, React). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='Consoel - Consulting Business React';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Consoel - Consulting Business React','template',
  '/galerie/inspiration-27/dist/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-27',
  '/inspiration/inspiration-27.png',
  'business / consulting / finance',
  ARRAY['react','business','consulting','finance','multipage'],
  'Template React 19 + Vite (source dans template-library/inspiration-27/consoel). Apercu = build statique self-heberge GND (base ./, HashRouter pour servir sous sous-dossier). Multi-pages (services, projets, blog, shop). Placeholders comble theme business. Pour usage : npm install && npm run build.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
