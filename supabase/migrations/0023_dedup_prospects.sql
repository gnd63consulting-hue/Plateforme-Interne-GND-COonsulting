-- =============================================
-- 0023_dedup_prospects.sql  (corrigé)
-- =============================================
-- Déduplication PHYSIQUE des prospects (one-shot, à exécuter dans Supabase SQL editor).
-- Pour chaque groupe d'entreprises homonymes : garde la meilleure fiche
-- (commission > statut actif > plus remplie > plus ancienne), réaffecte les
-- enfants (activities/tasks/sequence_enrollments/quotes/commissions/prospect_finance)
-- au keeper AVANT le DELETE (jamais de fusion financière aveugle), puis supprime
-- la ligne 100% vide. Anti-doublon permanent = côté sync (route.ts).
--
-- NOTE: utilise CREATE TEMP TABLE ... ON COMMIT DROP AS (et NON SELECT INTO ...
-- ON COMMIT DROP qui est invalide en Postgres -> erreur 42601).
-- =============================================

BEGIN;

CREATE TEMP TABLE _dedup_pairs ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    p.id,
    p.created_at,
    nullif(btrim(regexp_replace(lower(coalesce(p.company_name, '')), '\s+', ' ', 'g')), '') AS name_key,
    CASE lower(coalesce(p.status, ''))
      WHEN 'gagne' THEN 100 WHEN 'devis_envoye' THEN 90 WHEN 'rdv_pris' THEN 85
      WHEN 'en_discussion' THEN 80 WHEN 'en_attente_retour' THEN 75 WHEN 'a_recontacter' THEN 70
      WHEN 'a_rappeler' THEN 68 WHEN 'tentative_appel' THEN 66 WHEN 'contacte' THEN 60
      WHEN 'a_contacter' THEN 50 WHEN 'prospecte' THEN 45 WHEN 'processus_termine' THEN 20
      WHEN 'pas_interesse' THEN 15 WHEN 'coordonnees_invalides' THEN 12 WHEN 'ne_plus_demarcher' THEN 10
      WHEN 'perdu' THEN 8 WHEN 'archived' THEN 5 WHEN '' THEN 0 ELSE 30
    END AS status_rank,
    EXISTS (SELECT 1 FROM public.commissions c WHERE c.prospect_id = p.id) AS has_commission,
    (SELECT count(*) FROM jsonb_each_text(to_jsonb(p)) AS kv(k, v)
      WHERE kv.k NOT IN ('id','created_at','updated_at','synced_at','notion_page_id','status','merged_into','email_norm','phone_norm')
        AND kv.v IS NOT NULL AND btrim(kv.v) <> '' AND kv.v <> '[]' AND kv.v <> '{}') AS filled_count
  FROM public.prospects p
),
dup_groups AS (
  SELECT name_key FROM normalized WHERE name_key IS NOT NULL GROUP BY name_key HAVING count(*) > 1
),
ranked AS (
  SELECT n.*,
    row_number() OVER (PARTITION BY n.name_key ORDER BY n.has_commission DESC, n.status_rank DESC, n.filled_count DESC, n.created_at ASC, n.id ASC) AS rn,
    first_value(n.id) OVER (PARTITION BY n.name_key ORDER BY n.has_commission DESC, n.status_rank DESC, n.filled_count DESC, n.created_at ASC, n.id ASC) AS keeper_id
  FROM normalized n JOIN dup_groups g ON g.name_key = n.name_key
),
losers AS (
  SELECT id AS loser_id, keeper_id FROM ranked WHERE rn > 1 AND has_commission = false AND id <> keeper_id
)
SELECT loser_id, keeper_id FROM losers;

UPDATE public.activities a SET prospect_id = d.keeper_id FROM _dedup_pairs d WHERE a.prospect_id = d.loser_id;
UPDATE public.tasks t SET prospect_id = d.keeper_id FROM _dedup_pairs d WHERE t.prospect_id = d.loser_id;
UPDATE public.sequence_enrollments se SET prospect_id = d.keeper_id FROM _dedup_pairs d WHERE se.prospect_id = d.loser_id;
UPDATE public.quotes q SET prospect_id = d.keeper_id FROM _dedup_pairs d WHERE q.prospect_id = d.loser_id;
UPDATE public.commissions c SET prospect_id = d.keeper_id FROM _dedup_pairs d WHERE c.prospect_id = d.loser_id;
UPDATE public.prospect_finance pf SET prospect_id = d.keeper_id FROM _dedup_pairs d
  WHERE pf.prospect_id = d.loser_id AND NOT EXISTS (SELECT 1 FROM public.prospect_finance pf2 WHERE pf2.prospect_id = d.keeper_id);

DELETE FROM public.prospects p USING _dedup_pairs d WHERE p.id = d.loser_id;

DELETE FROM public.prospects p
WHERE nullif(btrim(coalesce(p.company_name,'')),'') IS NULL
  AND nullif(btrim(coalesce(p.contact_name,'')),'') IS NULL
  AND nullif(btrim(coalesce(p.email,'')),'') IS NULL
  AND nullif(btrim(coalesce(p.phone,'')),'') IS NULL
  AND nullif(btrim(coalesce(p.website,'')),'') IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.commissions c WHERE c.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.activities a WHERE a.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.sequence_enrollments s WHERE s.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.prospect_finance pf WHERE pf.prospect_id = p.id);

NOTIFY pgrst, 'reload schema';
COMMIT;
