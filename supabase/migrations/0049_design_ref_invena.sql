-- 0049_design_ref_invena.sql — Ajoute Invena (inspiration-26). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='Invena - Business Consulting HTML';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Invena - Business Consulting HTML','template',
  '/galerie/inspiration-26/invena-html/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-26',
  '/inspiration/inspiration-26.png',
  'business / corporate / consulting',
  ARRAY['business','corporate','consulting','finance','multipage'],
  'Template Envato business premium (HTML5 + Bootstrap, 96 pages, vraies images). 24 demos home (index a index-twenty-four) + versions onepage (onepage*). Mapping nom->fichier dans gnd-template-library/inspiration-26/invena-html/_variants.json (pour Cyrus). Demos : Business One/Two/Investment/Four, Marketing Coach/Agency, Event Conference, SaaS Consulting, Business Intelligence/Partners/Tree/Agency/Management/Coach, SEO Website, HR Website, Technology, Accountant One/Two, Finance, Insurance Home, Motel, Video/Parallax. Apercu auto-heberge GND.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
