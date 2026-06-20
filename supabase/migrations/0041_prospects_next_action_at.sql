-- =============================================
-- 0041_prospects_next_action_at.sql
-- =============================================
-- Reconciliation d'industrialisation BDD.
--
-- La colonne public.prospects.next_action_at (date du prochain rappel
-- commercial) existait UNIQUEMENT en prod (ajoutee a la main), jamais
-- versionnee dans le repo. Elle est pourtant utilisee par :
--   - fn_enroll_sequence (0016) : UPDATE prospects SET next_action_at = ...
--   - la liste d'appel / vue Rappels (logCall, call-actions.ts) qui ecrit
--     et lit next_action_at pour piloter les relances.
--
-- Sans cette migration, un replay from-scratch produisait une base ou la
-- colonne manque : le CREATE FUNCTION de 0016 passe (le corps plpgsql n'est
-- pas valide statiquement) mais la RPC -- et le log d'appel -- plantent au
-- premier appel (42703 column does not exist). La CI de replay etait donc
-- verte sur un schema faux.
--
-- Additif + idempotent : no-op en prod (la colonne y existe deja), retablit
-- prod == repo et rend la base reellement reconstructible.
--
-- ADDITIF -- a executer manuellement dans le Supabase SQL editor (no-op en
-- prod). Ne supprime rien, ne modifie aucune donnee.
-- =============================================

BEGIN;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;

-- Index partiel : recuperation rapide des relances en attente (vue Rappels).
CREATE INDEX IF NOT EXISTS prospects_next_action_at_idx
  ON public.prospects(next_action_at)
  WHERE next_action_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
