-- =============================================
-- 0042_drop_legacy_fr_columns.sql
-- =============================================
-- Nettoyage data quality (checklist sec.6) : suppression des 3 colonnes
-- doublons legacy FR de public.prospects, laissees apres le passage au schema
-- anglais. Confirmees 100% NULL en prod (diagnostic 0/0/0 le 20/06/2026) et
-- non referencees dans src/ (le select canonique prospects.ts n'utilise que les
-- colonnes EN).
--
--   nom_entreprise   -> doublon de company_name
--   secteur_activite -> doublon de sector
--   site_web         -> doublon de website
--
-- DROP COLUMN IF EXISTS : replay-safe (no-op si, lors d'un replay from-scratch,
-- la reconciliation 0008 a deja renomme ces colonnes FR en EN) ET prod-safe
-- (aucune donnee perdue, colonnes vides). Pas de CASCADE : aucune vue ne
-- depend de ces colonnes (les vues agents selectionnent les noms EN). Si une
-- dependance inattendue existait, le DROP echouerait proprement plutot que de
-- supprimer en cascade.
--
-- ADDITIF -- a executer dans le Supabase SQL editor.
-- =============================================

BEGIN;

ALTER TABLE public.prospects DROP COLUMN IF EXISTS nom_entreprise;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS secteur_activite;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS site_web;

NOTIFY pgrst, 'reload schema';

COMMIT;
