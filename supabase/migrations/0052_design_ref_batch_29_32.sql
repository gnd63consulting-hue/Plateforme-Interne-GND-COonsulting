-- 0052_design_ref_batch_29_32.sql — Findox, BizMaster, Oslim, SmartBiz. Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name IN (
 'Findox - Finance & Consulting HTML','BizMaster - Business Consulting React',
 'Oslim - Consulting Agency HTML','SmartBiz - Digital Agency React');
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Findox - Finance & Consulting HTML','template','/galerie/inspiration-29/findox-html-main/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-29','/inspiration/inspiration-29.png','finance / fintech / consulting',ARRAY['finance','fintech','consulting','business','multipage'],'Template Envato HTML5 (62 pages, 8 home variants). Apercu auto-heberge GND, placeholders comble theme finance.'),
 ('BizMaster - Business Consulting React','template','/galerie/inspiration-30/dist/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-30','/inspiration/inspiration-30.png','business / consulting / agence',ARRAY['react','business','consulting','agency','rtl'],'Template React (Create React App). 2 variantes : LTR + RTL (template-library/inspiration-30). Apercu = build LTR self-heberge GND (homepage ./, HashRouter). Placeholders comble theme business.'),
 ('Oslim - Consulting Agency HTML','template','/galerie/inspiration-31/oslim-html-files/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-31','/inspiration/inspiration-31.png','consulting / agence creative',ARRAY['consulting','agency','business','creative','multipage'],'Template Envato HTML5 (32 pages, 6 home variants). Apercu auto-heberge GND.'),
 ('SmartBiz - Digital Agency React','template','/galerie/inspiration-32/dist/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-32','/inspiration/inspiration-32.png','digital agency / marketing / business',ARRAY['react','agency','digital','marketing','business'],'Template React + Vite + TS. Apercu = build statique self-heberge GND (base ./, createHashRouter). Placeholders comble theme agence.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
