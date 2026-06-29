-- 0056_design_ref_cras.sql — Ajoute Cras (inspiration-46, base client showroom auto). Idempotent.
BEGIN;
DELETE FROM public.design_references WHERE kind='template' AND name='Cras - Car Repair & Auto Services HTML';
INSERT INTO public.design_references (name, kind, url, repo_url, preview_url, sector, tags, notes) VALUES
 ('Cras - Car Repair & Auto Services HTML','template',
  '/galerie/inspiration-46/cras/index.html',
  'https://github.com/gnd63consulting-hue/gnd-template-library/tree/main/inspiration-46',
  '/inspiration/inspiration-46.png',
  'automobile / garage / showroom / auto services',
  ARRAY['automobile','garage','auto-services','showroom','multipage'],
  'Template HTML5 auto (20 pages, 3 home variants, vraies images). BASE CLIENT pour projet showroom voiture (Karline-agency). Sections : hero, services, stats, pricing, team, brand, blog, contact, + pages about/appointment/gallery/video-gallery/services/team/testimonial/faq. A ADAPTER en phase 2 a la charte du client (karline-agency.fr).')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) AS templates FROM public.design_references WHERE kind='template';
