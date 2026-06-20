-- =============================================
-- GND Formation Commerciaux — Cleanup prospects schema
-- =============================================
-- À appliquer APRÈS :
--   1. la sync Notion initiale (0005 + sync OK, données dans les colonnes EN)
--   2. le déploiement du frontend aligné sur les colonnes EN
--
-- Ce script :
--   A) MET À JOUR la RLS de `prospects` pour utiliser created_by / assigned_to
--      au lieu de user_id (la policy de 0005 était sur user_id, qui reste
--      vide pour les lignes synchronisées → les commerciaux ne voyaient rien)
--   B) OPTIONNELLEMENT drop les colonnes FR orphelines ajoutées par 0005 :
--      nom, telephone, ville, statut, user_id,
--      nom_entreprise, secteur_activite, site_web, classification,
--      recommandation, synced_at
--
-- ⚠️  La partie B est commentée par défaut. Vérifie d'abord que :
--    - rien n'utilise plus ces colonnes (grep côté app : clean)
--    - l'index / la contrainte FK ont été supprimés (cf. partie B)
--  Puis décommente et relance.
--
-- NE PAS exécuter automatiquement ; à lancer à la main dans le SQL Editor.
-- =============================================

-- =============================================
-- PARTIE A — RLS alignée sur le schéma EN
-- =============================================

-- Pré-requis colonnes : created_by / assigned_to.
-- En prod ces colonnes ont été ajoutées à la main (SQL editor) AVANT ce
-- script. Sur une base VIERGE rejouée depuis le repo (CI db reset), elles
-- n'existent pas encore au moment où la policy ci-dessous les référence, d'où
-- un ERROR 42703 "column created_by does not exist". On les crée donc ici de
-- façon idempotente, juste avant la policy. `IF NOT EXISTS` = no-op total en
-- prod et sur toute base où elles existent déjà → l'état final est inchangé.
-- Type/FK alignés sur user_id (uuid, FK vers public.users(id)), nullable.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id);

-- Drop la policy de 0005 (prospects_owner_all sur user_id)
DROP POLICY IF EXISTS "prospects_owner_all" ON public.prospects;

-- Propriétaire = créateur ou assigné. Les prospects sync Notion ont
-- created_by = assigned_to = commercial cible. Les prospects créés
-- manuellement ont created_by = assigned_to = current user.
CREATE POLICY "prospects_owner_all" ON public.prospects
  FOR ALL
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
  )
  WITH CHECK (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
  );

-- La policy prospects_admin_read (de 0001) reste active.
-- Si jamais elle a été DROP par une intervention manuelle, la recréer :
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'prospects'
      AND policyname = 'prospects_admin_read'
  ) THEN
    CREATE POLICY "prospects_admin_read" ON public.prospects
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- =============================================
-- PARTIE B — Drop des colonnes FR (optionnel)
-- =============================================
-- Décommente ce bloc après avoir vérifié qu'aucune app ne les lit plus.

-- -- Supprime la FK vers public.users(id) posée par 0005 avant de drop user_id
-- ALTER TABLE public.prospects
--   DROP CONSTRAINT IF EXISTS prospects_user_id_fkey;
--
-- -- Supprime l'index de 0005 sur user_id
-- DROP INDEX IF EXISTS public.prospects_user_id_idx;
--
-- -- Supprime la CHECK sur statut posée par 0005
-- ALTER TABLE public.prospects
--   DROP CONSTRAINT IF EXISTS prospects_statut_check;
--
-- -- Drop des colonnes FR orphelines
-- ALTER TABLE public.prospects
--   DROP COLUMN IF EXISTS user_id,
--   DROP COLUMN IF EXISTS nom,
--   DROP COLUMN IF EXISTS telephone,
--   DROP COLUMN IF EXISTS ville,
--   DROP COLUMN IF EXISTS statut,
--   DROP COLUMN IF EXISTS nom_entreprise,
--   DROP COLUMN IF EXISTS secteur_activite,
--   DROP COLUMN IF EXISTS site_web,
--   DROP COLUMN IF EXISTS classification,
--   DROP COLUMN IF EXISTS recommandation;
--
-- -- synced_at reste utile pour savoir si une ligne provient de Notion
-- -- (différent de updated_at qui bouge à chaque edit manuel). Ne pas drop.
--
-- -- Force le refresh du schéma PostgREST
-- NOTIFY pgrst, 'reload schema';

-- =============================================
-- Vérif : schéma actuel + policies
-- =============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
ORDER BY ordinal_position;

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'prospects';
