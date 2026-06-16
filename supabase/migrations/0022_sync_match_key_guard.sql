-- =============================================
-- 0022_sync_match_key_guard.sql
-- =============================================
-- Plateforme Interne GND — Durcissement de la clé de match Notion → Supabase.
--
-- CONTEXTE : la sync Notion (/api/admin/sync-prospects) est passée en mode
--   « plateforme = source de vérité » :
--     - import UNIQUE des nouveaux leads (INSERT),
--     - UPDATE non destructif des fiches existantes (Notion comble seulement les
--       colonnes encore vides ; aucune valeur saisie côté plateforme n'est
--       écrasée — corrige le bug « les éditions admin repartaient au sync 6h »).
--
--   Le match fiche Notion ↔ prospect Supabase repose ENTIÈREMENT sur la colonne
--   `prospects.notion_page_id` (déjà introduite en 0005, avec sa contrainte
--   UNIQUE et son index). Aucune réécriture vers Notion n'est nécessaire : une
--   fois le prospect créé, son UUID Supabase EST le `prospect_id` canonique, et
--   les syncs suivantes le retrouvent par `notion_page_id` (clé stable).
--
--   FOLLOW-UP (hors scope, non implémenté ici) : si un token d'écriture Notion
--   devient disponible, on pourra réécrire l'UUID canonique dans la propriété
--   `prospect_id` de la ligne Notion (purement informatif côté Notion — la
--   stabilité du match n'en dépend pas).
--
-- BUT DE CETTE MIGRATION : purement DÉFENSIF & IDEMPOTENT. La correctness de la
--   sync non destructive dépend de l'unicité de `notion_page_id` ; on garantit
--   donc ici que la colonne, sa contrainte UNIQUE et son index existent, même
--   sur un environnement où une intervention manuelle les aurait retirés.
--   AUCUN changement de données. Safe à re-runner.
--
-- ⚠️ ADDITIF — à exécuter manuellement dans le Supabase SQL editor.
-- =============================================

BEGIN;

-- 1. Colonne (no-op si déjà présente).
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

-- 2. Contrainte UNIQUE (le match + l'anti-doublon de la sync en dépendent).
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

-- 3. Index de lookup (la sync filtre `WHERE notion_page_id IS NOT NULL` + match).
CREATE INDEX IF NOT EXISTS prospects_notion_page_id_idx
  ON public.prospects(notion_page_id);

-- 4. Force le rechargement du schéma PostgREST.
NOTIFY pgrst, 'reload schema';

COMMIT;
