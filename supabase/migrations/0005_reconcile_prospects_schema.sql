-- =============================================
-- GND Formation Commerciaux — Reconcile prospects schema
-- =============================================
-- Script d'auto-réparation idempotent.
-- À coller dans le SQL Editor du projet Supabase lié à Vercel.
--
-- Objectif : la table `prospects` en prod n'a pas toutes les colonnes
-- attendues par le code (découvert via /api/admin/sync-prospects qui
-- remontait "column prospects.user_id does not exist").
--
-- Ce script ne DROP RIEN. Il fait uniquement :
--   - ADD COLUMN IF NOT EXISTS  (colonnes de 0001 + colonnes Notion de 0004)
--   - ADD CONSTRAINT IF NOT EXISTS (FK, CHECK sur statut)
--   - CREATE INDEX IF NOT EXISTS
--   - CREATE OR REPLACE FUNCTION / CREATE TRIGGER (updated_at)
--   - ENABLE RLS + CREATE POLICY (idempotent via DROP POLICY IF EXISTS)
--
-- Note : user_id est ajouté en NULL-able pour tolérer d'éventuelles
-- lignes existantes orphelines. Une fois les données backfillées,
-- tu pourras durcir avec : ALTER TABLE public.prospects
--   ALTER COLUMN user_id SET NOT NULL;
-- =============================================

-- -------- Table users (pré-requis pour la FK) --------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'commercial' CHECK (role IN ('commercial', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------- Table prospects : création si absente --------
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- -------- Colonnes 0001 (base) --------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS user_id    UUID,
  ADD COLUMN IF NOT EXISTS nom        TEXT,
  ADD COLUMN IF NOT EXISTS telephone  TEXT,
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS ville      TEXT,
  ADD COLUMN IF NOT EXISTS statut     TEXT      NOT NULL DEFAULT 'a_contacter',
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- -------- Colonnes 0004 (Notion mirror) --------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS notion_page_id   TEXT,
  ADD COLUMN IF NOT EXISTS nom_entreprise   TEXT,
  ADD COLUMN IF NOT EXISTS secteur_activite TEXT,
  ADD COLUMN IF NOT EXISTS site_web         TEXT,
  ADD COLUMN IF NOT EXISTS classification   TEXT,
  ADD COLUMN IF NOT EXISTS recommandation   TEXT,
  ADD COLUMN IF NOT EXISTS synced_at        TIMESTAMPTZ;

-- -------- Contraintes --------
-- FK user_id → public.users(id). On crée seulement si pas déjà présente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prospects_user_id_fkey'
      AND conrelid = 'public.prospects'::regclass
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- CHECK sur statut
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prospects_statut_check'
      AND conrelid = 'public.prospects'::regclass
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_statut_check
      CHECK (statut IN ('a_contacter','contacte','rdv_pris','devis_envoye','gagne','perdu'));
  END IF;
END $$;

-- UNIQUE sur notion_page_id (pour l'upsert de la sync)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prospects_notion_page_id_key'
      AND conrelid = 'public.prospects'::regclass
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_notion_page_id_key UNIQUE (notion_page_id);
  END IF;
END $$;

-- -------- Indexes --------
CREATE INDEX IF NOT EXISTS prospects_user_id_idx       ON public.prospects(user_id);
CREATE INDEX IF NOT EXISTS prospects_updated_at_idx    ON public.prospects(updated_at DESC);
CREATE INDEX IF NOT EXISTS prospects_notion_page_id_idx ON public.prospects(notion_page_id);

-- -------- Trigger updated_at --------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prospects_updated_at ON public.prospects;
CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -------- Helper is_admin (pré-requis pour les policies) --------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- -------- RLS --------
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospects_owner_all" ON public.prospects;
CREATE POLICY "prospects_owner_all" ON public.prospects
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prospects_admin_read" ON public.prospects;
CREATE POLICY "prospects_admin_read" ON public.prospects
  FOR SELECT USING (public.is_admin());

-- -------- Forcer le rechargement du schéma PostgREST --------
-- (évite d'avoir à attendre le refresh auto)
NOTIFY pgrst, 'reload schema';

-- -------- Verif finale : renvoie la définition actuelle de la table --------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
ORDER BY ordinal_position;
