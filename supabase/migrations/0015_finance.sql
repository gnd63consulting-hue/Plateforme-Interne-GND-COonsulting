-- =============================================
-- 0015_finance.sql
-- =============================================
-- Plateforme Interne GND — CRM Sprint 8 (Module Financier interne) :
--   1. prospects.deal_amount  — montant HT du contrat signé (status='gagne')
--   2. Table quotes           — devis (en-tête : totaux, statut, validité…)
--   3. Table quote_lines      — lignes de devis (désignation, qté, PU HT…)
--   4. Table commissions       — commission RÉELLE par commercial (vs estimée)
--   5. RLS owner-based + accès admin (réutilise is_admin_or_limited())
--
-- ⚠️ ADDITIF — à exécuter manuellement dans le Supabase SQL editor.
--    Ne supprime rien, ne modifie aucune table/colonne existante.
--    Idempotent : safe à re-runner (IF NOT EXISTS, DROP POLICY IF EXISTS,
--    ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).
--
--    Aucune intégration externe (Stripe/email) : flux 100% interne.
-- =============================================

BEGIN;

-- =====================================================================
-- 1. prospects.deal_amount — montant HT signé
-- =====================================================================
-- Rempli quand un prospect passe à status='gagne' (capté par la modale
-- "Montant du contrat signé" sur la fiche 360). NUMERIC pour des montants €.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS deal_amount NUMERIC(12,2);

COMMENT ON COLUMN public.prospects.deal_amount IS
  'Montant HT du contrat signé (rempli au passage en status=gagne). Sert de base_amount à la commission réelle.';

-- =====================================================================
-- 2. Table quotes — en-tête de devis
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  numero       TEXT,
  statut       TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','accepte','refuse')),
  montant_ht   NUMERIC(12,2) DEFAULT 0,
  tva_rate     NUMERIC(5,2)  DEFAULT 20,
  montant_tva  NUMERIC(12,2) DEFAULT 0,
  montant_ttc  NUMERIC(12,2) DEFAULT 0,
  valid_until  DATE,
  notes        TEXT,
  owner_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_prospect_idx
  ON public.quotes(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_owner_idx
  ON public.quotes(owner_id);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. Table quote_lines — lignes de devis
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.quote_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id         UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  position         INT DEFAULT 0,
  designation      TEXT NOT NULL,
  quantite         NUMERIC(10,2) DEFAULT 1,
  prix_unitaire_ht NUMERIC(12,2) DEFAULT 0,
  total_ht         NUMERIC(12,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS quote_lines_quote_idx
  ON public.quote_lines(quote_id, position);

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. Table commissions — commission RÉELLE par commercial
-- =====================================================================
-- amount est GÉNÉRÉ (base_amount * rate) → impossible de désynchroniser
-- le montant du couple base/taux. base_amount = deal_amount du prospect,
-- rate = users.commission_rate figé au moment du gain.
CREATE TABLE IF NOT EXISTS public.commissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id   UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  commercial_id UUID NOT NULL REFERENCES auth.users(id),
  base_amount   NUMERIC(12,2) NOT NULL,
  rate          NUMERIC(5,4)  NOT NULL,
  amount        NUMERIC(12,2) GENERATED ALWAYS AS (base_amount * rate) STORED,
  statut        TEXT NOT NULL DEFAULT 'a_payer'
    CHECK (statut IN ('a_payer','paye','annule')),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commissions_commercial_statut_idx
  ON public.commissions(commercial_id, statut);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5. RLS Policies
-- =====================================================================

-- -------- quotes : owner-based + admin --------
DROP POLICY IF EXISTS "quotes_owner_all" ON public.quotes;
CREATE POLICY "quotes_owner_all" ON public.quotes
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "quotes_admin_all" ON public.quotes;
CREATE POLICY "quotes_admin_all" ON public.quotes
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- -------- quote_lines : via le devis parent (owner OU admin) --------
-- SELECT / INSERT / UPDATE / DELETE autorisés ssi le devis parent
-- appartient au user courant OU si le user est admin.
DROP POLICY IF EXISTS "quote_lines_via_parent_all" ON public.quote_lines;
CREATE POLICY "quote_lines_via_parent_all" ON public.quote_lines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND (q.owner_id = auth.uid() OR public.is_admin_or_limited())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND (q.owner_id = auth.uid() OR public.is_admin_or_limited())
    )
  );

-- -------- commissions : le commercial voit les SIENNES (SELECT) --------
-- INSERT/UPDATE/DELETE = admin only. Le flux "gain" insère la commission
-- côté serveur en service-role (server action), donc côté client une
-- simple policy SELECT own + admin all suffit.
DROP POLICY IF EXISTS "commissions_select_own" ON public.commissions;
CREATE POLICY "commissions_select_own" ON public.commissions
  FOR SELECT
  USING (commercial_id = auth.uid());

DROP POLICY IF EXISTS "commissions_admin_all" ON public.commissions;
CREATE POLICY "commissions_admin_all" ON public.commissions
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- =====================================================================
-- 6. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
