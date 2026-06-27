-- 0055 — Xpovio + Pixlab (HTML, apercu) + 7 Figma (design source, external_ref). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE name IN (
 'Xpovio - Digital Creative Agency HTML','Pixlab - Brand Design Agency HTML',
 'Arigo - Creative Agency (Figma)','Conzon - Creative Agency (Figma)','Koolie - Digital Agency (Figma)',
 'Ravox - Modern Creative Agency (Figma)','TechAI - Digital Agency Startup (Figma)',
 'Veltrixo - Agency (Figma)','Vorix - Creative Digital Agency (Figma)');
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Xpovio - Digital Creative Agency HTML','template','/galerie/inspiration-44/main-file/ltr/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-44','/inspiration/inspiration-44.png','digital agency / creative',ARRAY['agency','digital','creative','portfolio','multipage'],'Template HTML5 agence digitale (LTR + RTL). Apercu auto-heberge GND.'),
 ('Pixlab - Brand Design Agency HTML','template','/galerie/inspiration-45/HTML/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-45','/inspiration/inspiration-45.png','brand / design / dev agency',ARRAY['agency','branding','design','portfolio','multipage'],'Template HTML5 agence brand/design. Apercu auto-heberge GND.'),
 ('Arigo - Creative Agency (Figma)','external_ref',NULL,NULL,NULL,'creative agency / portfolio',ARRAY['figma','agency','creative','portfolio','design-source'],'Source Figma (.fig). A importer dans Figma -> fournir URL pour apercu + acces Cyrus (Figma MCP).'),
 ('Conzon - Creative Agency (Figma)','external_ref',NULL,NULL,NULL,'creative agency',ARRAY['figma','agency','creative','design-source'],'Source Figma (.fig, placeholder). A importer dans Figma -> URL.'),
 ('Koolie - Digital Agency (Figma)','external_ref',NULL,NULL,NULL,'digital creative agency',ARRAY['figma','agency','digital','design-source'],'Source Figma (.fig). A importer dans Figma -> URL.'),
 ('Ravox - Modern Creative Agency (Figma)','external_ref',NULL,NULL,NULL,'modern creative agency',ARRAY['figma','agency','creative','design-source'],'Source Figma (.fig). A importer dans Figma -> URL.'),
 ('TechAI - Digital Agency Startup (Figma)','external_ref',NULL,NULL,NULL,'digital agency / startup / AI',ARRAY['figma','agency','startup','ai','design-source'],'Source Figma (.fig). A importer dans Figma -> URL.'),
 ('Veltrixo - Agency (Figma)','external_ref',NULL,NULL,NULL,'agency',ARRAY['figma','agency','design-source'],'Source Figma (.fig). A importer dans Figma -> URL.'),
 ('Vorix - Creative Digital Agency (Figma)','external_ref',NULL,NULL,NULL,'creative digital agency',ARRAY['figma','agency','creative','design-source'],'Source Figma (.fig, 126Mo > limite GitHub). A importer dans Figma -> URL.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) FILTER (WHERE kind='template') AS templates, count(*) FILTER (WHERE kind='external_ref') AS refs_externes FROM public.design_references;
