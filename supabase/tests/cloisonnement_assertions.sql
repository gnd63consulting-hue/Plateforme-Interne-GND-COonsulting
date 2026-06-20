-- =============================================================================
-- cloisonnement_assertions.sql  (GND CRM — suite d'assertions de cloisonnement)
-- =============================================================================
-- BUT : verifier, en UNE execution, que les invariants de securite du CRM
--       tiennent toujours. A lancer dans le Supabase SQL editor (role par
--       defaut, PAS un agent_*) apres CHAQUE migration touchant la securite
--       (RLS, GRANTs, vues scopees, isolation finance).
--
-- LECTURE : chaque ligne renvoie une colonne `verdict` = 'PASS' ou 'FAIL XXX'.
--           Objectif : ZERO ligne 'FAIL'. Trier visuellement, ou voir le
--           recapitulatif final (section 6) qui compte les FAIL.
--
-- INVARIANTS COUVERTS :
--   1. RLS ENABLE sur toutes les tables sensibles.
--   2. Les roles agent_* n'ont AUCUN acces a prospect_finance / commissions /
--      invoices (le "joyau" financier reste scelle).
--   3. Les roles agent_* n'ont AUCUN SELECT brut sur la table prospects
--      (ils passent par les vues scopees).
--   4. Les vues scopees agents (v_agent_prospects / v_agent_studio_prospects /
--      v_agent_commerciaux) n'exposent PAS deal_amount.
--   5. La colonne deal_amount n'existe plus sur prospects (isolee en
--      prospect_finance, migration 0021).
--   6. La RLS prospect_finance est admin-only (aucune policy pour les autres).
--
-- 100% lecture seule (sauf section 7, optionnelle, commentee). Idempotent.
-- Non destructif. Re-runnable autant de fois que voulu.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1 — RLS activee (pg_class.relrowsecurity) sur les tables sensibles
-- -----------------------------------------------------------------------------
-- Attendu : relrowsecurity = true pour CHAQUE table. Sinon, RLS desactivee =
-- toute la table lisible par n'importe quel role authentifie => FAIL.
SELECT
  '1. RLS enabled' AS section,
  c.relname        AS objet,
  c.relrowsecurity AS rls_on,
  CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL — RLS OFF' END AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'prospects',
    'prospect_finance',
    'prospect_intel',
    'prospect_draft',
    'agents',
    'site_brief',
    'site_mockups',
    'commissions',
    'quotes',
    'quote_lines',
    'invoices',
    'activities',
    'users'
  )
ORDER BY c.relname;

-- -----------------------------------------------------------------------------
-- SECTION 2 — Aucun role agent_* ne peut LIRE le financier
-- -----------------------------------------------------------------------------
-- Le coeur du cloisonnement : deal_amount (prospect_finance), commissions et
-- invoices sont AVEUGLES pour tous les agents IA. Attendu : false partout.
-- has_table_privilege renvoie l'effet net des GRANT/REVOKE pour le role.
WITH agent_roles(role) AS (
  VALUES
    ('agent_enrichisseur'),
    ('agent_redacteur'),
    ('agent_analytics'),
    ('agent_orchestrator'),
    ('agent_sender'),
    ('agent_sales_ops'),
    ('agent_devis'),
    ('agent_studio')
),
finance_tables(tbl) AS (
  VALUES
    ('public.prospect_finance'),
    ('public.commissions'),
    ('public.invoices')
)
SELECT
  '2. Agents aveugles au finance' AS section,
  ar.role,
  ft.tbl,
  -- On teste seulement si le role existe (sinon NULL = role pas encore cree).
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = ar.role)
      THEN 'SKIP — role absent'
    WHEN has_table_privilege(ar.role, ft.tbl, 'SELECT') = false
      THEN 'PASS'
    ELSE 'FAIL — agent peut SELECT finance'
  END AS verdict
FROM agent_roles ar
CROSS JOIN finance_tables ft
ORDER BY ar.role, ft.tbl;

-- -----------------------------------------------------------------------------
-- SECTION 3 — Aucun role agent_* n'a de SELECT brut sur prospects
-- -----------------------------------------------------------------------------
-- Les agents passent par les vues scopees (v_agent_prospects, etc.). Un SELECT
-- direct sur la table prospects rouvrirait la surface (colonnes non filtrees).
-- Attendu : false (pas de SELECT table-level brut) pour chaque agent.
WITH agent_roles(role) AS (
  VALUES
    ('agent_enrichisseur'),
    ('agent_redacteur'),
    ('agent_analytics'),
    ('agent_orchestrator'),
    ('agent_sender'),
    ('agent_sales_ops'),
    ('agent_devis'),
    ('agent_studio')
)
SELECT
  '3. Pas de SELECT brut sur prospects' AS section,
  ar.role,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = ar.role)
      THEN 'SKIP — role absent'
    WHEN has_table_privilege(ar.role, 'public.prospects', 'SELECT') = false
      THEN 'PASS'
    ELSE 'FAIL — agent peut SELECT prospects brut'
  END AS verdict
FROM agent_roles ar
ORDER BY ar.role;

-- -----------------------------------------------------------------------------
-- SECTION 4 — Les vues scopees agents n'exposent PAS deal_amount
-- -----------------------------------------------------------------------------
-- Meme si deal_amount vit desormais dans prospect_finance, on verifie qu'AUCUNE
-- vue agent ne reintroduit une colonne financiere interdite. Attendu : 0 ligne
-- financiere => verdict PASS sur la ligne de synthese.
WITH forbidden(col) AS (
  VALUES ('deal_amount'), ('commission'), ('amount'), ('montant_ttc'),
         ('montant_ht'), ('base_amount'), ('rate')
),
view_cols AS (
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN (
      'v_agent_prospects',
      'v_agent_studio_prospects',
      'v_agent_commerciaux',
      'v_agent_pipeline'
    )
)
SELECT
  '4. Vues agents sans finance' AS section,
  vc.table_name AS vue,
  vc.column_name AS colonne_interdite,
  'FAIL — colonne financiere exposee dans une vue agent' AS verdict
FROM view_cols vc
JOIN forbidden f ON lower(vc.column_name) = f.col
UNION ALL
-- Ligne de synthese : PASS si aucune colonne interdite trouvee ci-dessus.
SELECT
  '4. Vues agents sans finance' AS section,
  '(synthese)' AS vue,
  '—' AS colonne_interdite,
  CASE WHEN NOT EXISTS (
    SELECT 1
    FROM view_cols vc
    JOIN forbidden f ON lower(vc.column_name) = f.col
  ) THEN 'PASS' ELSE 'FAIL — voir lignes ci-dessus' END AS verdict
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- SECTION 5 — deal_amount a bien quitte la table prospects (migration 0021)
-- -----------------------------------------------------------------------------
-- Si la colonne reapparait sur prospects, n'importe quel role avec SELECT sur
-- prospects (assistant, owner) pourrait relire le CA => regression critique.
SELECT
  '5. deal_amount hors de prospects' AS section,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prospects'
      AND column_name = 'deal_amount'
  ) THEN 'FAIL — deal_amount de retour sur prospects'
    ELSE 'PASS' END AS verdict;

-- Et il DOIT vivre dans prospect_finance.
SELECT
  '5. deal_amount present dans prospect_finance' AS section,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prospect_finance'
      AND column_name = 'deal_amount'
  ) THEN 'PASS'
    ELSE 'FAIL — prospect_finance.deal_amount manquant' END AS verdict;

-- -----------------------------------------------------------------------------
-- SECTION 6 — prospect_finance : RLS admin-only (aucune policy hors admin)
-- -----------------------------------------------------------------------------
-- On verifie que la seule policy sur prospect_finance est la policy admin
-- (is_admin_or_limited). Toute policy supplementaire = surface a auditer.
SELECT
  '6. RLS prospect_finance admin-only' AS section,
  pol.polname AS policy,
  CASE
    WHEN pol.polname = 'prospect_finance_admin_all' THEN 'PASS'
    ELSE 'FAIL — policy inattendue sur prospect_finance (a auditer)'
  END AS verdict
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'prospect_finance'
UNION ALL
-- Synthese : il DOIT exister au moins la policy admin.
SELECT
  '6. RLS prospect_finance admin-only' AS section,
  '(synthese: policy admin presente)' AS policy,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'prospect_finance'
      AND pol.polname = 'prospect_finance_admin_all'
  ) THEN 'PASS' ELSE 'FAIL — policy admin manquante' END AS verdict
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- SECTION 6 bis — Le filet anti-fuite JSONB sur prospect_intel existe
-- (trigger 0030 : rejette toute cle financiere dans le payload libre)
-- -----------------------------------------------------------------------------
SELECT
  '6b. Trigger anti-finance sur prospect_intel' AS section,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.prospect_intel'::regclass
      AND tgname = 'trg_reject_financial_keys_in_intel'
  ) THEN 'PASS' ELSE 'FAIL — trigger 0030 absent' END AS verdict;

-- -----------------------------------------------------------------------------
-- RECAPITULATIF GLOBAL — compte les FAIL sur l'ensemble des sections
-- -----------------------------------------------------------------------------
-- Si total_fail = 0 => cloisonnement intact. Sinon, remonter dans les sections
-- ci-dessus pour identifier les lignes 'FAIL ...'.
WITH all_checks AS (
  -- 1. RLS
  SELECT CASE WHEN c.relrowsecurity THEN 0 ELSE 1 END AS fail
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN (
    'prospects','prospect_finance','prospect_intel','prospect_draft','agents',
    'site_brief','site_mockups','commissions','quotes','quote_lines','invoices',
    'activities','users')

  UNION ALL
  -- 2. agents aveugles au finance (roles existants seulement)
  SELECT CASE WHEN has_table_privilege(ar.role, ft.tbl, 'SELECT') THEN 1 ELSE 0 END
  FROM (VALUES
    ('agent_enrichisseur'),('agent_redacteur'),('agent_analytics'),
    ('agent_orchestrator'),('agent_sender'),('agent_sales_ops'),
    ('agent_devis'),('agent_studio')) AS ar(role)
  CROSS JOIN (VALUES
    ('public.prospect_finance'),('public.commissions'),('public.invoices')) AS ft(tbl)
  WHERE EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = ar.role)

  UNION ALL
  -- 3. pas de SELECT brut prospects pour les agents
  SELECT CASE WHEN has_table_privilege(ar.role, 'public.prospects', 'SELECT') THEN 1 ELSE 0 END
  FROM (VALUES
    ('agent_enrichisseur'),('agent_redacteur'),('agent_analytics'),
    ('agent_orchestrator'),('agent_sender'),('agent_sales_ops'),
    ('agent_devis'),('agent_studio')) AS ar(role)
  WHERE EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = ar.role)

  UNION ALL
  -- 4. vues agents sans colonne financiere
  SELECT count(*)::int
  FROM information_schema.columns vc
  JOIN (VALUES ('deal_amount'),('commission'),('amount'),('montant_ttc'),
               ('montant_ht'),('base_amount'),('rate')) AS f(col)
    ON lower(vc.column_name) = f.col
  WHERE vc.table_schema='public'
    AND vc.table_name IN ('v_agent_prospects','v_agent_studio_prospects',
                          'v_agent_commerciaux','v_agent_pipeline')

  UNION ALL
  -- 5. deal_amount absent de prospects
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='prospects' AND column_name='deal_amount'
  ) THEN 1 ELSE 0 END

  UNION ALL
  -- 6. policy admin presente sur prospect_finance
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid=pol.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='prospect_finance'
      AND pol.polname='prospect_finance_admin_all'
  ) THEN 0 ELSE 1 END

  UNION ALL
  -- 6b. trigger anti-finance present
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.prospect_intel'::regclass
      AND tgname='trg_reject_financial_keys_in_intel'
  ) THEN 0 ELSE 1 END
)
SELECT
  'RECAP GLOBAL' AS section,
  sum(fail)      AS total_fail,
  CASE WHEN sum(fail) = 0
    THEN 'PASS — cloisonnement intact'
    ELSE 'FAIL — ' || sum(fail) || ' assertion(s) en echec (voir sections ci-dessus)'
  END AS verdict
FROM all_checks;

-- -----------------------------------------------------------------------------
-- SECTION 7 (OPTIONNELLE, DESTRUCTIVE-LOOKING — laissee EN COMMENTAIRE)
-- -----------------------------------------------------------------------------
-- Test actif du filet JSONB 0030 : l'INSERT ci-dessous DOIT lever une exception
-- "Cloisonnement: ... cle interdite detectee.". A lancer SEUL et manuellement.
-- (Rollback automatique car il echoue ; ne persiste rien.)
--
-- INSERT INTO public.prospect_intel (prospect_id, intel_type, source, payload, created_by)
-- SELECT id, 'enrichment', 'test.leak', '{"deal_amount": 9999}'::jsonb, 'postgres'
-- FROM public.prospects LIMIT 1;
-- -> ATTENDU : ERROR  Cloisonnement: prospect_intel.payload ne doit contenir...
--
-- =============================================================================
-- FIN de la suite d'assertions de cloisonnement.
-- =============================================================================
