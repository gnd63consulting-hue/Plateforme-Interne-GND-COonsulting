-- =============================================
-- 0031_postvente_facturation.sql  (GND CRM — Hermes, post-vente + facturation)
-- ADDITIF. Tables post-vente operationnelles + facturation cloisonnee.
-- Cloisonnement (decision Roodny) : agent_devis (Hermes-Devis) REDIGE des devis
-- en 'draft' (lignes + totaux du devis qu'il prepare), AVEUGLE aux factures, au
-- CA signe (prospect_finance) et aux commissions. Les transitions de statut sont
-- reservees a l'humain. 100% idempotent. A executer MANUELLEMENT en Supabase.
-- =============================================
--
-- =============================================
-- NOTE INDUSTRIALISATION BDD (replay reproductible) — voir aussi 0040.
-- En prod ce fichier n'a ete que PARTIELLEMENT applique : les tables post-vente
-- (onboarding/customer_success/support_tickets/upsell_opportunities) et la RLS
-- admin sont passees, mais la table `invoices` et la section agent_devis sur
-- `quotes` n'ont pas pris (collision de schema avec la table CANONIQUE `quotes`
-- de 0015). Pour rendre un replay sur base vierge reussi SANS changer le schema
-- final de prod, on neutralise ici les morceaux qui entrent en collision avec
-- 0015 et qui sont DE TOUTE FACON re-etablis par 0040 sur les noms canoniques :
--   1. La re-CREATE de `quotes` / `quote_lines` (section B) : commentee. La
--      table canonique vient de 0015 (numero/statut/montant_ht/...). Sur base
--      vierge ce CREATE IF NOT EXISTS etait un no-op ; on l'enleve pour lever
--      l'ambiguite de schema. AUCUN changement d'etat final.
--   2. Toute la section D (GRANT/REVOKE/RLS agent_devis sur `quotes`) : commentee.
--      Elle visait des colonnes fantomes (reference/total_ht/total_ttc/status)
--      absentes de la table canonique -> elle aurait ECHOUE sur base vierge.
--      0040 reconcilie ces GRANT/RLS sur les noms canoniques
--      (numero/montant_ht/montant_ttc/statut='brouillon'). 0040 reste le
--      PROPRIETAIRE de l'acces agent_devis a `quotes`.
--   3. Le bloc VERIFICATION final (has_column_privilege sur quotes.status) :
--      commente (la colonne `status` n'existe pas sur la table canonique ->
--      l'appel aurait leve une erreur en fin de migration).
-- `invoices` est CONSERVEE (c'est precisement la table manquante en prod que ce
-- replay doit recreer). Les REVOKE de mur dur agent_devis sont deplaces dans 0040
-- (qui les re-applique deja, y compris invoices via to_regclass).
-- AUCUNE de ces modifications ne change l'etat final du schema vs la prod.
-- =============================================

BEGIN;

-- =====================================================================
-- A. POST-VENTE OPERATIONNEL (aucun financier)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.onboarding (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'a_demarrer',   -- a_demarrer|en_cours|termine|bloque
  checklist    JSONB NOT NULL DEFAULT '[]',
  owner_id     UUID,                                  -- chef de projet (users.id)
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_success (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id   UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  health        TEXT,                                 -- vert|orange|rouge
  satisfaction  INT,                                  -- 0-10
  last_check_at TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  body        TEXT,
  status      TEXT NOT NULL DEFAULT 'ouvert',         -- ouvert|en_cours|resolu|ferme
  priority    TEXT DEFAULT 'normale',                 -- basse|normale|haute|urgente
  assigned_to UUID,
  created_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.upsell_opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id     UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  signal          TEXT,                               -- signal d'upsell detecte
  produit_suggere TEXT,
  status          TEXT DEFAULT 'detecte',             -- detecte|propose|gagne|perdu
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- B. FACTURATION
-- =====================================================================
-- [NEUTRALISE POUR REPLAY] La table CANONIQUE `quotes` (+ `quote_lines`) est
-- creee par 0015_finance.sql (colonnes numero/statut/montant_ht/montant_ttc/
-- owner_id...). Le CREATE IF NOT EXISTS ci-dessous etait un no-op sur la prod et
-- sur une base vierge ; il decrivait un schema DIFFERENT (reference/status/
-- total_ht/total_ttc) qui n'a jamais pris. On le commente pour eviter toute
-- ambiguite : 0015 est l'unique proprietaire du schema `quotes`/`quote_lines`.
-- CREATE TABLE IF NOT EXISTS public.quotes (
--   id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   prospect_id      UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
--   reference        TEXT,
--   status           TEXT NOT NULL DEFAULT 'draft',     -- draft|sent|accepted|refused|expired
--   total_ht         NUMERIC(12,2) DEFAULT 0,
--   total_ttc        NUMERIC(12,2) DEFAULT 0,
--   tva_rate         NUMERIC(5,2)  DEFAULT 20.0,
--   created_by_agent BOOLEAN DEFAULT false,             -- true si redige par Hermes-Devis
--   created_by       UUID,
--   created_at       TIMESTAMPTZ DEFAULT now(),
--   updated_at       TIMESTAMPTZ DEFAULT now()
-- );
--
-- CREATE TABLE IF NOT EXISTS public.quote_lines (
--   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   quote_id      UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
--   label         TEXT NOT NULL,
--   qty           NUMERIC(10,2) DEFAULT 1,
--   unit_price_ht NUMERIC(12,2) DEFAULT 0,
--   line_total_ht NUMERIC(12,2) DEFAULT 0,
--   position      INT DEFAULT 0
-- );

-- `invoices` : CONSERVEE. C'est la table post-vente manquante en prod que ce
-- replay doit recreer. Sa FK quote_id pointe vers la table canonique 0015.
CREATE TABLE IF NOT EXISTS public.invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  reference   TEXT,
  status      TEXT NOT NULL DEFAULT 'brouillon',      -- brouillon|emise|payee|en_retard|annulee
  amount_ht   NUMERIC(12,2) DEFAULT 0,
  amount_ttc  NUMERIC(12,2) DEFAULT 0,
  due_at      TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- C. RLS — admin/admin_limited plein pouvoir sur tout
-- =====================================================================
-- ENABLE RLS sur quotes/quote_lines est idempotent (deja active par 0015).
-- Les policies *_admin_all ne referencent que is_admin_or_limited() (aucune
-- colonne) -> compatibles avec le schema canonique. On les conserve a l'identique
-- pour preserver l'etat final de prod.
ALTER TABLE public.onboarding           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['onboarding','customer_success','support_tickets',
                           'upsell_opportunities','quotes','quote_lines','invoices']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin_or_limited()) WITH CHECK (public.is_admin_or_limited())',
      t||'_admin_all', t);
  END LOOP;
END $$;

-- =====================================================================
-- D. agent_devis (Hermes-Devis) — "voit le devis qu'il redige, rien d'autre"
-- =====================================================================
-- [NEUTRALISE POUR REPLAY] Toute cette section visait la table `quotes` avec des
-- colonnes fantomes (reference/total_ht/total_ttc/status) qui n'existent pas sur
-- la table canonique de 0015 -> les GRANT (...) et les RLS (... status='draft')
-- auraient ECHOUE sur une base vierge (et n'ont jamais pris en prod).
-- 0040_quotes_reconcile.sql RE-ETABLIT integralement l'acces agent_devis a
-- `quotes`/`quote_lines` sur les NOMS CANONIQUES (numero/montant_ht/montant_ttc/
-- statut='brouillon'), ajoute created_by_agent/created_by/updated_at a la VRAIE
-- table, et re-applique le mur dur (REVOKE prospect_finance/commissions/invoices,
-- ce dernier garde par to_regclass). 0040 est donc le PROPRIETAIRE de l'acces
-- agent_devis a quotes. On commente ici pour ne pas casser le replay ; l'etat
-- final (apres 0040) est identique a la prod.
-- GRANT USAGE ON SCHEMA public TO agent_devis;
--
-- GRANT SELECT                                                      ON public.quotes TO agent_devis;
-- GRANT INSERT (prospect_id, reference, total_ht, total_ttc, tva_rate, created_by_agent) ON public.quotes TO agent_devis;
-- GRANT UPDATE (reference, total_ht, total_ttc, tva_rate)           ON public.quotes TO agent_devis;
--
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_lines TO agent_devis;
--
-- REVOKE ALL ON public.prospect_finance FROM agent_devis;
-- REVOKE ALL ON public.commissions      FROM agent_devis;
-- REVOKE ALL ON public.invoices         FROM agent_devis;
--
-- DROP POLICY IF EXISTS "quotes_devis_select" ON public.quotes;
-- CREATE POLICY "quotes_devis_select" ON public.quotes
--   FOR SELECT TO agent_devis USING (created_by_agent = true);
--
-- DROP POLICY IF EXISTS "quotes_devis_insert" ON public.quotes;
-- CREATE POLICY "quotes_devis_insert" ON public.quotes
--   FOR INSERT TO agent_devis WITH CHECK (created_by_agent = true AND status = 'draft');
--
-- DROP POLICY IF EXISTS "quotes_devis_update" ON public.quotes;
-- CREATE POLICY "quotes_devis_update" ON public.quotes
--   FOR UPDATE TO agent_devis
--   USING (created_by_agent = true AND status = 'draft')
--   WITH CHECK (created_by_agent = true AND status = 'draft');
--
-- DROP POLICY IF EXISTS "quote_lines_devis_all" ON public.quote_lines;
-- CREATE POLICY "quote_lines_devis_all" ON public.quote_lines
--   FOR ALL TO agent_devis
--   USING     (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.created_by_agent = true AND q.status = 'draft'))
--   WITH CHECK(EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.created_by_agent = true AND q.status = 'draft'));

-- =====================================================================
-- E. Registre : brancher Hermes-Devis sur son role (etait NULL en 0026)
-- =====================================================================
-- Conserve : no-op si l'agent Hermes-Devis n'existe pas encore (0 ligne mise a
-- jour). 0040 re-applique le meme UPDATE par securite.
UPDATE public.agents
SET db_role = 'agent_devis'
WHERE codename = 'Hermes-Devis' AND db_role IS DISTINCT FROM 'agent_devis';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================
-- VERIFICATION (hors transaction)
-- =============================================
-- [NEUTRALISE POUR REPLAY] has_column_privilege(...,'public.quotes','status',...)
-- leve une erreur car la colonne `status` n'existe pas sur la table canonique
-- (0015 = `statut`). Les memes verifications (sur noms canoniques) vivent dans
-- 0040. On commente pour ne pas faire echouer la fin de migration.
-- SELECT 'devis SELECT quotes (true)'      AS chk, has_table_privilege('agent_devis','public.quotes','SELECT')           AS got, true  AS exp
-- UNION ALL SELECT 'devis UPDATE quotes.status (false)', has_column_privilege('agent_devis','public.quotes','status','UPDATE'), false
-- UNION ALL SELECT 'devis SELECT invoices (false)',      has_table_privilege('agent_devis','public.invoices','SELECT'),         false
-- UNION ALL SELECT 'devis SELECT prospect_finance (false)', has_table_privilege('agent_devis','public.prospect_finance','SELECT'), false
-- UNION ALL SELECT 'devis SELECT commissions (false)',   has_table_privilege('agent_devis','public.commissions','SELECT'),      false;
--
-- SELECT codename, db_role FROM public.agents WHERE codename = 'Hermes-Devis';
