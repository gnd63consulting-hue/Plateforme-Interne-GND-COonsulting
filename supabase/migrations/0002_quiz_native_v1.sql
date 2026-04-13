-- =============================================
-- GND Formation Commerciaux - Quiz natif v1
-- =============================================
-- Remplace la validation manuelle (legacy) par un
-- quiz natif scoré côté serveur (seuil 70%).
--
-- À exécuter dans le SQL Editor du projet Supabase
-- APRÈS 0001_init.sql.
-- Le seed des 72 questions est dans 0003_quiz_seed.sql.
-- =============================================

-- -------- Table quiz_questions --------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug TEXT NOT NULL,
  position    INT  NOT NULL,
  question    TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('single', 'multiple')),
  options     JSONB NOT NULL,    -- [{"id":"a","label":"..."}, ...]
  correct_ids JSONB NOT NULL,    -- ["a"] ou ["a","c"]
  explanation TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_slug, position)
);

CREATE INDEX IF NOT EXISTS quiz_questions_module_idx
  ON public.quiz_questions(module_slug);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs connectés peuvent LIRE les questions.
-- Les correct_ids ne sont jamais exposés au client par la route GET
-- (la route filtre les colonnes renvoyées).
DROP POLICY IF EXISTS "quiz_questions_read_authenticated" ON public.quiz_questions;
CREATE POLICY "quiz_questions_read_authenticated"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (true);

-- Pas de policy INSERT/UPDATE/DELETE -> bloqué par défaut.
-- Toute écriture passe par la migration (source de vérité v1).

-- -------- Table quiz_attempts --------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  score       INT  NOT NULL,
  total       INT  NOT NULL,
  percentage  INT  NOT NULL,
  passed      BOOLEAN NOT NULL,
  answers     JSONB NOT NULL,    -- dump des réponses envoyées par le user
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_module_idx
  ON public.quiz_attempts(user_id, module_slug);

CREATE INDEX IF NOT EXISTS quiz_attempts_created_idx
  ON public.quiz_attempts(created_at DESC);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- L'utilisateur lit uniquement SES tentatives.
DROP POLICY IF EXISTS "quiz_attempts_read_self" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_read_self"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin lit tout.
DROP POLICY IF EXISTS "quiz_attempts_read_admin" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_read_admin"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Pas de policy INSERT côté client : la route /api/quiz/submit
-- utilise la service role key qui bypasse la RLS.

-- -------- ALTER progressions --------
-- Ajoute les colonnes d'enrichissement liées au quiz natif.
ALTER TABLE public.progressions
  ADD COLUMN IF NOT EXISTS last_attempt_id UUID REFERENCES public.quiz_attempts(id),
  ADD COLUMN IF NOT EXISTS best_percentage INT;

-- Retrait de la policy "FOR ALL" qui autorisait l'UPSERT côté client
-- via la clé anon (legacy bouton "j'ai terminé mon quiz").
-- Désormais, l'écriture progressions passe uniquement par /api/quiz/submit
-- avec la service role key.
DROP POLICY IF EXISTS "progressions_owner_all" ON public.progressions;

-- Lecture seule pour le commercial sur ses propres progressions.
DROP POLICY IF EXISTS "progressions_owner_read" ON public.progressions;
CREATE POLICY "progressions_owner_read"
  ON public.progressions FOR SELECT
  USING (user_id = auth.uid());

-- La policy "progressions_admin_read" reste active (créée dans 0001_init.sql).
