-- =============================================
-- GND Formation Commerciaux — Extend prospects with Notion enrichment fields
-- =============================================
-- Goal: mirror in Supabase the analytical + social fields that the
-- "Pipeline Prospects GND" Notion DB carries (filled by Roodny + Claude
-- during the april 2026 cleanup). Without these columns, the platform
-- can't display gérant, IG, recommandation, analyses, arguments, etc.
--
-- Idempotent. No data deletion. To run AFTER 0006_cleanup_prospects.sql.
-- =============================================

-- -------- Contact split (Notion has prenom + nom + role separately) --------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS prenom_contact TEXT,
  ADD COLUMN IF NOT EXISTS role_contact   TEXT;

-- -------- Social / web ----------------------------------------------------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS instagram          TEXT,
  ADD COLUMN IF NOT EXISTS facebook           TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_contact   TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_entreprise TEXT,
  ADD COLUMN IF NOT EXISTS tiktok             TEXT;

-- -------- Long-form analyses ----------------------------------------------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS analyse_besoin          TEXT,
  ADD COLUMN IF NOT EXISTS analyse_budget          TEXT,
  ADD COLUMN IF NOT EXISTS analyse_timing          TEXT,
  ADD COLUMN IF NOT EXISTS recommandation_approche TEXT;

-- -------- Multi-select arrays (Notion sends them as comma-joined strings) --
-- We store them as text[] so the frontend can render badges easily.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS arguments_cles    TEXT[],
  ADD COLUMN IF NOT EXISTS besoins_detectes  TEXT[];

-- -------- Qualifying metadata ---------------------------------------------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS ca_estime          TEXT,
  ADD COLUMN IF NOT EXISTS classification     TEXT,
  ADD COLUMN IF NOT EXISTS branche            TEXT,
  ADD COLUMN IF NOT EXISTS note_google        NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS nombre_avis        INTEGER,
  ADD COLUMN IF NOT EXISTS taille_entreprise  TEXT,
  ADD COLUMN IF NOT EXISTS nombre_employes    INTEGER;

-- -------- Address split (Notion has both rue+code+ville and a free text) --
-- We keep the existing `city` (already used by the frontend) and add a
-- precise `address` for the full street line. The sync writes both.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS address TEXT;

-- -------- Force PostgREST schema reload -----------------------------------
NOTIFY pgrst, 'reload schema';

-- -------- Verification: dump current columns -------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
ORDER BY ordinal_position;
