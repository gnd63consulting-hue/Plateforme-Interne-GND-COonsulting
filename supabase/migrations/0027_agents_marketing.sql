-- =============================================
-- 0027_agents_marketing.sql  (GND CRM — branche marketing « au-delà »)
-- ADDITIF sur 0026. Seed registre des 6 agents marketing (orchestrateur Apollon
-- séparé + Iris/Oracle/Vigie/Éos/Phare). db_role NULL : ils ne touchent pas le
-- CRM prospects (contenu/SEO/social via outils externes, connecteurs ultérieurs).
-- À exécuter MANUELLEMENT dans le Supabase SQL editor. 100% idempotent.
-- Aucun nouveau rôle Postgres (pas d'accès DB prospects pour le marketing à ce stade).
-- =============================================

BEGIN;

INSERT INTO public.agents (codename, role, mission, kpi, model, db_role, scope_note) VALUES
 ('Apollon','Orchestrateur Marketing','Coordonne la branche marketing (Iris/Oracle/Vigie/Éos/Phare), tient le calendrier éditorial, reporte aux admins.','Calendrier éditorial tenu / contenus publiés','claude-opus',NULL,'Orchestrateur SÉPARÉ de Cyrus (branche marketing, garde le default commercial propre). Ne touche pas le CRM. Connecteurs = ultérieur.'),
 ('Iris','Contenu / Éditorial','Calendrier éditorial, piliers, formats, hooks, atomisation (hub-and-spoke).','Contenus produits / atomisés','claude-sonnet',NULL,'Branche marketing. Jugement éditorial final humain. Store Notion/Drive ; connecteurs = ultérieur.'),
 ('Oracle','SEO / GEO','Topical authority, answer-first, entity SEO, citations IA (ChatGPT/Perplexity/AI Overviews).','Citations IA / positions / trafic organique','claude-sonnet',NULL,'Branche marketing. 25 skills seo-* dispo ; piège SPA (forcer SSR). Outils SEO = ultérieur.'),
 ('Vigie','Social media / Community','Production + écoute LinkedIn/Instagram (carrousels format #1 2026), reporting social.','Engagement / portée / leads sociaux','claude-sonnet',NULL,'Branche marketing. Conversation publique = humain (anti-ban). APIs social = ultérieur.'),
 ('Éos','Demand gen / Growth','Crée et capte la demande (95-5, dark funnel, growth loops, self-reported attribution).','Demande captée / pipeline marketing','claude-sonnet',NULL,'Branche marketing. Sortant froid = validé humain. Connecteurs = ultérieur.'),
 ('Phare','Marque / Notoriété','SOV/ESOV, distinctive assets, earned media (levier GEO), disponibilité mentale long terme.','Part de voix / mentions / cohérence charte','claude-sonnet',NULL,'Branche marketing. Charte verrouillée (#F39253/#532418, Marcellus/Inter). Monitoring = ultérieur.')
ON CONFLICT (codename) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Vérif : la branche marketing apparaît au registre
SELECT codename, role, db_role FROM public.agents
WHERE codename IN ('Apollon','Iris','Oracle','Vigie','Éos','Phare')
ORDER BY codename;
