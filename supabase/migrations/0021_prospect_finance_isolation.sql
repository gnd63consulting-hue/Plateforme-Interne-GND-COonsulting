-- =============================================
-- 0021_prospect_finance_isolation.sql
-- =============================================
-- Plateforme Interne GND — Security Sprint :
--   FIX 1 (CRITIQUE) : isolation RLS des MONTANTS financiers.
--
-- PROBLEME : `prospects.deal_amount` (montant HT du contrat signe) vivait sur
--   la table `prospects`. Le role 'assistant' (0019) a un SELECT sur TOUTE la
--   table prospects → un simple `select=deal_amount` via PostgREST exposait le
--   CA, alors que le masquage etait purement applicatif (UI). De meme tout role
--   non-admin proprietaire d'une fiche pouvait lire le montant.
--
-- CORRECTIF : on deplace `deal_amount` dans une table dediee
--   `public.prospect_finance` (1-1 avec prospects), avec une RLS qui n'autorise
--   QUE `is_admin_or_limited()` a lire/ecrire. Plus aucune colonne financiere ne
--   reste sur `prospects` → impossible de fuiter le montant via une requete sur
--   prospects, quel que soit le role.
--
-- ⚠️ ADDITIF — a executer manuellement dans le Supabase SQL editor.
--    Non destructif au sens donnees : on COPIE deal_amount AVANT de droper la
--    colonne. Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS /
--    INSERT ... ON CONFLICT DO NOTHING / DROP COLUMN IF EXISTS).
--
--    A executer AVANT de deployer le code applicatif correspondant (le code
--    lit/ecrit desormais `prospect_finance` ; tant que la migration n'est pas
--    passee, l'app continue de fonctionner avec l'ancienne colonne car le code
--    n'est pas encore deploye — respecter l'ordre : SQL d'abord, deploy ensuite,
--    cf. notes de cutover).
-- =============================================

BEGIN;

-- =====================================================================
-- 1. Table prospect_finance — isolation des montants financiers
-- =====================================================================
-- 1 ligne max par prospect (PK = prospect_id, FK CASCADE). Si le prospect est
-- supprime, sa ligne financiere part avec lui.
CREATE TABLE IF NOT EXISTS public.prospect_finance (
  prospect_id  UUID PRIMARY KEY
    REFERENCES public.prospects(id) ON DELETE CASCADE,
  -- Montant HT du contrat signe (rempli au passage en status='gagne' ou au
  -- paiement Stripe). Sert de base_amount a la commission reelle.
  deal_amount  NUMERIC(12,2),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.prospect_finance IS
  'Montants financiers par prospect (deal_amount). Isole de prospects pour une RLS admin-only — empeche toute lecture du CA par les roles non-admin (assistant, commercial). Cf. migration 0021.';
COMMENT ON COLUMN public.prospect_finance.deal_amount IS
  'Montant HT du contrat signe (status=gagne / paiement Stripe). Base de la commission reelle.';

ALTER TABLE public.prospect_finance ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. Migration des donnees existantes (COPIE avant DROP)
-- =====================================================================
-- On copie tous les deal_amount non nuls actuellement sur prospects vers la
-- nouvelle table. ON CONFLICT DO NOTHING rend l'operation re-runnable.
INSERT INTO public.prospect_finance (prospect_id, deal_amount)
SELECT p.id, p.deal_amount
FROM public.prospects p
WHERE p.deal_amount IS NOT NULL
ON CONFLICT (prospect_id) DO NOTHING;

-- =====================================================================
-- 3. RLS — admin / admin_limited UNIQUEMENT (lecture ET ecriture)
-- =====================================================================
-- Aucune policy pour les autres roles → assistant / commercial / freelance /
-- stagiaire ne peuvent NI lire NI ecrire. Le code applicatif ecrit via le
-- client service-role (bypass RLS) ; cote client la lecture est donc reservee
-- aux admins par cette policy (defense au niveau base, plus seulement UI).
DROP POLICY IF EXISTS "prospect_finance_admin_all" ON public.prospect_finance;
CREATE POLICY "prospect_finance_admin_all" ON public.prospect_finance
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- =====================================================================
-- 4. Suppression de la colonne financiere sur prospects
-- =====================================================================
-- Apres copie : on retire deal_amount de prospects. Plus aucune surface de
-- fuite via une requete sur la table prospects (assistant/commercial inclus).
ALTER TABLE public.prospects
  DROP COLUMN IF EXISTS deal_amount;

-- =====================================================================
-- 5. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
