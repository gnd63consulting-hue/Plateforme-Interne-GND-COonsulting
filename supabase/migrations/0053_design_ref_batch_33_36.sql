-- 0053_design_ref_batch_33_36.sql — BitFix, Eolexi, Finbiz, Torkbiz. Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name IN (
 'BitFix - Corporate Business HTML','Eolexi - Business Consulting HTML',
 'Finbiz - Consulting Business HTML','Torkbiz - Business HTML');
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('BitFix - Corporate Business HTML','template','/galerie/inspiration-33/Bitfix/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-33','/inspiration/inspiration-33.png','corporate / business / tech',ARRAY['corporate','business','tech','services','multipage'],'Template HTML5 (49 pages, 7 home variants). Apercu auto-heberge GND, placeholders comble.'),
 ('Eolexi - Business Consulting HTML','template','/galerie/inspiration-34/eolexi-html-main/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-34','/inspiration/inspiration-34.png','business / consulting / agency',ARRAY['business','consulting','agency','saas','multipage'],'Template HTML5 (66 pages, 8 home variants). Apercu auto-heberge GND.'),
 ('Finbiz - Consulting Business HTML','template','/galerie/inspiration-35/finbiz-html/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-35','/inspiration/inspiration-35.png','finance / consulting / business',ARRAY['finance','consulting','business','rtl','multipage'],'Template HTML5 (74 pages, 14 home variants). 2 variantes LTR + RTL (template-library/inspiration-35). Apercu auto-heberge GND.'),
 ('Torkbiz - Business HTML','template','/galerie/inspiration-36/torkbiz/index.html','https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-36','/inspiration/inspiration-36.png','business / agency / light + dark',ARRAY['business','agency','consulting','dark-mode','multipage'],'Template HTML5 (24 pages, 6 home variants, light+dark). Apercu auto-heberge GND.')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
