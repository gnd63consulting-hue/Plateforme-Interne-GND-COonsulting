-- =============================================
-- 0040_quotes_reconcile.sql  (F3 - reconcile duplicate quotes/quote_lines)
-- ADDITIF. Schema canonique = 0015_finance.sql (+0017 stripe), confirme en prod
-- (quotes = numero/statut/montant_ht/montant_ttc/owner_id/stripe_*).
-- 0031_postvente avait re-CREATE quotes/quote_lines avec des colonnes
-- incompatibles (reference/total_ht/status/created_by_agent) qui n'ont jamais
-- pris (CREATE IF NOT EXISTS no-op car 0015 < 0031), donc ses GRANT/RLS
-- agent_devis visaient des colonnes fantomes.
-- Cette migration : (1) ajoute les colonnes que agent_devis a besoin sur la
-- VRAIE table, (2) reecrit les GRANT/RLS agent_devis sur les noms canoniques
-- (numero/montant_ht/montant_ttc/statut='brouillon'), (3) garde le mur dur
-- (agent_devis aveugle a prospect_finance/commissions/invoices).
-- Idempotent. Aucun rename, aucun drop de colonne, zero perte de donnee.
-- A executer MANUELLEMENT dans Supabase SQL editor.
-- =============================================

BEGIN;

-- 1. Colonnes dont agent_devis a besoin, ajoutees a la table CANONIQUE.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS created_by_agent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by       UUID,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT now();

-- Backfill explicite des devis humains existants (le DEFAULT couvre les futurs).
UPDATE public.quotes SET created_by_agent = false WHERE created_by_agent IS NULL;

-- 2. GRANT agent_devis sur les noms de colonnes CANONIQUES (remplace 0031).
GRANT USAGE ON SCHEMA public TO agent_devis;

GRANT SELECT ON public.quotes TO agent_devis;
GRANT INSERT (prospect_id, numero, montant_ht, montant_tva, montant_ttc, tva_rate, created_by_agent)
  ON public.quotes TO agent_devis;
GRANT UPDATE (numero, montant_ht, montant_tva, montant_ttc, tva_rate)
  ON public.quotes TO agent_devis;
-- NB: 'statut' volontairement NON accorde en UPDATE -> l'agent ne change pas le
-- statut (transition humaine uniquement), meme intention que 0031.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_lines TO agent_devis;

-- 3. Mur dur : aveugle a la finance signee / factures / commissions.
REVOKE ALL ON public.prospect_finance FROM agent_devis;
REVOKE ALL ON public.commissions      FROM agent_devis;
REVOKE ALL ON public.invoices         FROM agent_devis;

-- 4. RLS agent_devis sur statut canonique 'brouillon' + created_by_agent.
DROP POLICY IF EXISTS "quotes_devis_select" ON public.quotes;
CREATE POLICY "quotes_devis_select" ON public.quotes
  FOR SELECT TO agent_devis USING (created_by_agent = true);

DROP POLICY IF EXISTS "quotes_devis_insert" ON public.quotes;
CREATE POLICY "quotes_devis_insert" ON public.quotes
  FOR INSERT TO agent_devis
  WITH CHECK (created_by_agent = true AND statut = 'brouillon');

DROP POLICY IF EXISTS "quotes_devis_update" ON public.quotes;
CREATE POLICY "quotes_devis_update" ON public.quotes
  FOR UPDATE TO agent_devis
  USING      (created_by_agent = true AND statut = 'brouillon')
  WITH CHECK (created_by_agent = true AND statut = 'brouillon');

DROP POLICY IF EXISTS "quote_lines_devis_all" ON public.quote_lines;
CREATE POLICY "quote_lines_devis_all" ON public.quote_lines
  FOR ALL TO agent_devis
  USING     (EXISTS (SELECT 1 FROM public.quotes q
                     WHERE q.id = quote_id AND q.created_by_agent = true AND q.statut = 'brouillon'))
  WITH CHECK(EXISTS (SELECT 1 FROM public.quotes q
                     WHERE q.id = quote_id AND q.created_by_agent = true AND q.statut = 'brouillon'));

-- 5. Registre : Hermes-Devis cable sur son role.
UPDATE public.agents
SET db_role = 'agent_devis'
WHERE codename = 'Hermes-Devis' AND db_role IS DISTINCT FROM 'agent_devis';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION (hors transaction)
SELECT 'devis SELECT quotes (true)'              AS chk, has_table_privilege('agent_devis','public.quotes','SELECT')               AS got, true  AS exp
UNION ALL SELECT 'devis UPDATE quotes.statut (false)',    has_column_privilege('agent_devis','public.quotes','statut','UPDATE'),    false
UNION ALL SELECT 'devis INSERT quotes.numero (true)',     has_column_privilege('agent_devis','public.quotes','numero','INSERT'),    true
UNION ALL SELECT 'devis SELECT invoices (false)',         has_table_privilege('agent_devis','public.invoices','SELECT'),           false
UNION ALL SELECT 'devis SELECT prospect_finance (false)', has_table_privilege('agent_devis','public.prospect_finance','SELECT'),   false
UNION ALL SELECT 'devis SELECT commissions (false)',      has_table_privilege('agent_devis','public.commissions','SELECT'),        false;
