-- =============================================
-- GND Formation Commerciaux - Notion sync + explanations
-- =============================================
-- 1. Prospects : colonnes pour la synchronisation Notion → Plateforme
-- 2. Quiz : seed des explanations du Module 01 (10 questions)
--
-- À exécuter dans le SQL Editor du projet Supabase APRÈS 0003_quiz_seed.sql.
-- Idempotent.
-- =============================================

-- -------- 1. Prospects : colonnes Notion --------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS notion_page_id       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS nom_entreprise       TEXT,
  ADD COLUMN IF NOT EXISTS secteur_activite     TEXT,
  ADD COLUMN IF NOT EXISTS site_web             TEXT,
  ADD COLUMN IF NOT EXISTS classification       TEXT,
  ADD COLUMN IF NOT EXISTS recommandation       TEXT,
  ADD COLUMN IF NOT EXISTS synced_at            TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS prospects_notion_page_id_idx
  ON public.prospects(notion_page_id);

-- -------- 2. Quiz : explanations Module 01 --------
-- Les 10 questions du Module 01 sont identifiées par position.
-- UPDATE idempotent : toujours réécrit la bonne explication.

UPDATE public.quiz_questions
SET explanation = 'GND Consulting est une agence de communication digitale établie, qui lance une offre sites vitrines. On se présente comme une agence complète — pas comme une boîte de sites internet, qui sonne amateur.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 1;

UPDATE public.quiz_questions
SET explanation = 'Les 4 branches officielles : Marketing Digital & Branding, Web Design & SEO, Automatisation par IA, Audiovisuel. C''est ce positionnement multi-expertise qui permet de dire "studio créatif complet".'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 2;

UPDATE public.quiz_questions
SET explanation = 'Les 4 valeurs GND : Passion, Fiabilité, Innovation, Collaboration. Elles structurent le discours : on s''investit (Passion), on livre dans les délais (Fiabilité), on utilise les derniers outils (Innovation), on travaille en binôme avec le client (Collaboration).'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 3;

UPDATE public.quiz_questions
SET explanation = 'GND cible explicitement les commerces locaux avec cette offre sites vitrines. C''est un positionnement précis — "commerces locaux", pas "sites internet en général" — qui te rend crédible face à un restaurateur, un coiffeur ou un garagiste.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 4;

UPDATE public.quiz_questions
SET explanation = 'Les 5 expertises : production audiovisuelle, design graphique, motion design, automatisation/IA et sites internet. Cet éventail permet au commercial de positionner GND comme un studio créatif, pas un simple prestataire web.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 5;

UPDATE public.quiz_questions
SET explanation = 'Délais GND : 1 à 2 semaines, contre 4 à 8 chez les freelances et 6 à 16 chez les agences classiques. C''est l''argument différenciant clé : on livre 3 à 5 fois plus vite que la concurrence.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 6;

UPDATE public.quiz_questions
SET explanation = 'Ce qui différencie GND : studio créatif complet, expertise IA intégrée, équipe réactive (délais courts), qualité pro à tarif accessible, approche humaine. Jamais "on fait des sites pas chers" — le positionnement doit rester qualitatif.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 7;

UPDATE public.quiz_questions
SET explanation = 'On ne dit JAMAIS "on est une boîte de sites internet", "on démarre" ou "on n''a pas beaucoup de clients". Ces formules cassent la crédibilité. On dit "agence établie qui lance une offre sites vitrines" et "tarifs préférentiels pour les premiers clients de cette offre".'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 8;

UPDATE public.quiz_questions
SET explanation = 'L''IA et l''automatisation ne sont pas un gadget : elles sont intégrées aux process GND pour produire plus vite et mieux. C''est un argument à ressortir face à un prospect "ancienne école" qui doute de la réactivité d''une petite structure.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 9;

UPDATE public.quiz_questions
SET explanation = 'La réponse type à "Vous faites quoi exactement ?" : "GND est une agence de communication digitale complète. On propose aujourd''hui une offre sites vitrines pour les commerces locaux, c''est ce qui nous amène à vous contacter." Court, précis, positionné.'
WHERE module_slug = 'module-01-decouverte-gnd' AND position = 10;
