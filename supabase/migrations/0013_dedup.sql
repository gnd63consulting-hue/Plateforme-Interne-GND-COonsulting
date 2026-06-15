-- =============================================
-- 0013_dedup.sql
-- =============================================
-- Plateforme Interne GND — CRM Sprint 3 (Déduplication prospects) :
--   1. Colonnes générées normalisées email_norm / phone_norm (immutables)
--   2. Index partiels sur ces colonnes (lookup doublon rapide)
--   3. Colonne de traçabilité de fusion merged_into
--   4. Table dedup_dismissed — groupes marqués « pas un doublon » (admin)
--
-- ⚠️ ADDITIF — à exécuter MANUELLEMENT dans le Supabase SQL editor.
--    Ne supprime rien, ne modifie aucune donnée existante.
--    Idempotent : safe à re-runner (ADD COLUMN IF NOT EXISTS,
--    CREATE INDEX IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
--    DROP POLICY IF EXISTS).
--
-- Note : l'audit_log de 0012 (trigger prospects_audit) couvre déjà toutes
--    les mutations sur public.prospects — pas de trigger ajouté ici.
-- =============================================

BEGIN;

-- =====================================================================
-- 1. Colonnes générées normalisées (STORED, immutables)
-- =====================================================================
-- email_norm : email en minuscules, trimé, NULL si vide.
-- phone_norm : téléphone réduit à ses seuls chiffres, NULL si vide.
-- Expressions inline (pas de fonction custom) → restent IMMUTABLE et
-- éligibles à une colonne générée STORED.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS email_norm TEXT
    GENERATED ALWAYS AS (lower(nullif(trim(email), ''))) STORED;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS phone_norm TEXT
    GENERATED ALWAYS AS (nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')) STORED;

-- =====================================================================
-- 2. Index partiels pour la détection de doublons
-- =====================================================================
CREATE INDEX IF NOT EXISTS prospects_email_norm_idx
  ON public.prospects(email_norm)
  WHERE email_norm IS NOT NULL;

CREATE INDEX IF NOT EXISTS prospects_phone_norm_idx
  ON public.prospects(phone_norm)
  WHERE phone_norm IS NOT NULL;

-- =====================================================================
-- 3. Traçabilité de fusion
-- =====================================================================
-- Renseignée sur la (les) fiche(s) doublon(s) archivée(s) ; pointe vers la
-- fiche maître conservée. NULL = fiche jamais fusionnée.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES public.prospects(id);

CREATE INDEX IF NOT EXISTS prospects_merged_into_idx
  ON public.prospects(merged_into)
  WHERE merged_into IS NOT NULL;

-- =====================================================================
-- 4. Table dedup_dismissed — groupes marqués « pas un doublon »
-- =====================================================================
-- signature : clé stable du groupe ignoré, ex. 'email:jean@x.fr' ou
--   'phone:0612345678' (9 derniers chiffres pour le tél, cf. détection).
-- Un groupe présent ici est exclu de la liste des doublons à traiter.
CREATE TABLE IF NOT EXISTS public.dedup_dismissed (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature    TEXT NOT NULL UNIQUE,
  dismissed_by UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dedup_dismissed ENABLE ROW LEVEL SECURITY;

-- Admin only (réutilise is_admin_or_limited() de 0009).
DROP POLICY IF EXISTS "dedup_dismissed_admin_all" ON public.dedup_dismissed;
CREATE POLICY "dedup_dismissed_admin_all" ON public.dedup_dismissed
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- =====================================================================
-- 5. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
