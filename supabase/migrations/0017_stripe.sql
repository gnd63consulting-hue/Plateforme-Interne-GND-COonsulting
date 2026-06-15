-- =============================================
-- 0017_stripe.sql
-- =============================================
-- Plateforme Interne GND — CRM Sprint 11 (Intégration Stripe, mode TEST) :
--   1. prospects.stripe_customer_id — customer Stripe réutilisé entre devis
--   2. quotes.stripe_*              — facture / lien de paiement + statut + paid_at
--   3. Table stripe_events         — idempotence des webhooks (1 event = 1 fois)
--
-- ⚠️ ADDITIF — à exécuter manuellement dans le Supabase SQL editor AVANT de
--    merger le code (la fiche prospect lit désormais les colonnes stripe_*).
--    Ne supprime rien, ne modifie aucune table/colonne existante.
--    Idempotent (ADD COLUMN IF NOT EXISTS, CREATE TABLE/INDEX IF NOT EXISTS).
-- =============================================

BEGIN;

-- =====================================================================
-- 1. prospects.stripe_customer_id
-- =====================================================================
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.prospects.stripe_customer_id IS
  'Identifiant customer Stripe (cus_...). Créé à la 1re facture/lien, réutilisé ensuite.';

-- =====================================================================
-- 2. quotes.stripe_* — références Stripe du devis
-- =====================================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS stripe_invoice_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_url      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id  TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_status           TEXT,
  ADD COLUMN IF NOT EXISTS paid_at                 TIMESTAMPTZ;

COMMENT ON COLUMN public.quotes.stripe_status IS
  'Dernier état Stripe connu du devis : NULL | sent | paid.';

-- Index pour les lookups du webhook (fallback si metadata.quote_id absent).
CREATE INDEX IF NOT EXISTS quotes_stripe_invoice_idx
  ON public.quotes(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quotes_stripe_payment_link_idx
  ON public.quotes(stripe_payment_link_id) WHERE stripe_payment_link_id IS NOT NULL;

-- =====================================================================
-- 3. Table stripe_events — idempotence des webhooks
-- =====================================================================
-- Le webhook insère event.id AVANT de traiter ; un doublon (livraison Stripe
-- rejouée) tombe sur la PK et est ignoré.
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id          TEXT PRIMARY KEY,   -- event.id Stripe (evt_...)
  type        TEXT,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- RLS activée SANS policy : aucune lecture/écriture côté client. Seul le
-- service-role (route webhook) y accède (il bypass la RLS).
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
