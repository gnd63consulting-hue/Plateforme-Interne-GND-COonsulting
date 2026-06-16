-- =============================================
-- 0023_dedup_prospects.sql
-- =============================================
-- Plateforme Interne GND — Déduplication PHYSIQUE des prospects (one-shot).
--
-- CONTEXTE : la DB Notion "Pipeline Prospects" contenait ~21 entreprises en
--   double (même société sur 2 lignes Notion), dont ~10 assignées à DEUX
--   commerciaux différents. La sync Notion → Supabase importe chaque ligne
--   Notion 1:1 (clé `notion_page_id` UNIQUE), elle a donc créé DEUX lignes
--   `prospects` pour la même entreprise, possédées par deux commerciaux.
--
--   Le correctif PERMANENT (anti-doublon à l'INSERT) vit dans la sync
--   (src/app/api/admin/sync-prospects/route.ts). CE script nettoie l'EXISTANT
--   UNE SEULE FOIS : pour chaque groupe d'entreprises homonymes, il garde la
--   MEILLEURE fiche et supprime les autres, en préservant le travail réel
--   (activités, tâches, séquences, devis, finances, commissions).
--
-- ⚠️ ADDITIF MANUEL — à exécuter UNE FOIS dans le Supabase SQL editor, par un
--    admin, APRÈS avoir déployé la sync anti-doublon (cf. notes de cutover du
--    rapport). Idempotent au sens « safe à re-runner » : une fois la base
--    dédupliquée, un second passage ne trouve plus de groupe multi-lignes et
--    ne supprime donc plus rien.
--
-- RÈGLE DE CONSERVATION (par groupe d'entreprises homonymes, le 1er gagne) :
--    1. Fiche portant une COMMISSION (deal réel) — priorité absolue.
--    2. Rang de STATUT : une fiche active (Qualifié/Contacté/RDV/Devis/Gagné…)
--       passe AVANT une fiche disqualifiée (perdu / pas intéressé / archived /
--       statut brut). Empêche de garder une coquille « Non pertinent » au
--       détriment d'une fiche vivante.
--    3. Nombre de colonnes clés non vides (fiche la plus renseignée).
--    4. La plus ANCIENNE (created_at puis id croissants) — tie-break stable.
--
-- SÉCURITÉ ANTI-FUSION FINANCIÈRE : une fiche portant une commission n'est
--    JAMAIS supprimée. Si DEUX fiches d'un même groupe portent chacune une
--    commission, les DEUX sont conservées (aucune fusion aveugle de données
--    financières) — voir le filtre `has_commission` dans `losers`.
--
-- PORTÉE DU DELETE : strictement les fiches « perdantes » d'un groupe
--    multi-lignes homonyme + l'éventuelle fiche 100% vide (junk). Aucune
--    suppression de masse possible : un groupe à 1 seule ligne ne produit
--    jamais de perdant ; une ligne sans nom d'entreprise n'est jamais
--    groupée avec une autre.
--
-- GESTION DES ENFANTS (avant DELETE du perdant) :
--    - activities / tasks / sequence_enrollments / quotes : FK ON DELETE
--      CASCADE (cf. 0012 / 0014 / 0015). On les RÉ-AFFECTE au keeper AVANT de
--      supprimer le perdant pour NE PAS perdre le travail réel (un appel logué,
--      une relance planifiée, un devis) — sinon le CASCADE les détruirait.
--    - commissions : FK ON DELETE SET NULL (cf. 0015). On les ré-affecte aussi
--      au keeper (par sécurité ; en pratique une fiche à commission n'est
--      jamais un perdant). Le montant financier n'est jamais détruit.
--    - prospect_finance : 1-1 (PK = prospect_id, CASCADE). On déplace la ligne
--      du perdant vers le keeper UNIQUEMENT si le keeper n'en a pas déjà une
--      (sinon on laisse la ligne du perdant être supprimée par CASCADE — le
--      keeper, mieux classé, porte déjà la valeur financière de référence).
-- =============================================

BEGIN;

-- =====================================================================
-- 0. Helpers locaux (CTE) — normalisation + classement
-- =====================================================================
-- Normalisation du nom d'entreprise : minuscules, espaces compressés, trim.
-- Une ligne dont le nom normalisé est vide (NULL ou '') est EXCLUE du
-- groupement → les fiches sans nom ne sont jamais fusionnées entre elles.
WITH normalized AS (
  SELECT
    p.id,
    p.created_at,
    nullif(
      btrim(regexp_replace(lower(coalesce(p.company_name, '')), '\s+', ' ', 'g')),
      ''
    ) AS name_key,
    -- Rang de statut : plus haut = plus « vivant » (donc à conserver).
    -- Les statuts disqualifiés/morts/bruts reçoivent un rang faible pour ne
    -- jamais être gardés au détriment d'une fiche active homonyme.
    CASE lower(coalesce(p.status, ''))
      WHEN 'gagne'              THEN 100
      WHEN 'devis_envoye'       THEN 90
      WHEN 'rdv_pris'           THEN 85
      WHEN 'en_discussion'      THEN 80
      WHEN 'en_attente_retour'  THEN 75
      WHEN 'a_recontacter'      THEN 70
      WHEN 'a_rappeler'         THEN 68
      WHEN 'tentative_appel'    THEN 66
      WHEN 'contacte'           THEN 60
      WHEN 'a_contacter'        THEN 50
      WHEN 'prospecte'          THEN 45  -- legacy default
      WHEN 'processus_termine'  THEN 20
      WHEN 'pas_interesse'      THEN 15
      WHEN 'coordonnees_invalides' THEN 12
      WHEN 'ne_plus_demarcher'  THEN 10
      WHEN 'perdu'              THEN 8
      WHEN 'archived'           THEN 5
      WHEN ''                   THEN 0   -- statut absent
      ELSE 30                            -- statut inconnu/brut : milieu de grille
    END AS status_rank,
    -- A-t-elle une commission (= deal réel) ? Utilisé pour le classement ET
    -- comme garde-fou anti-suppression (un porteur de commission n'est jamais
    -- supprimé, cf. CTE losers).
    EXISTS (
      SELECT 1 FROM public.commissions c WHERE c.prospect_id = p.id
    ) AS has_commission,
    -- Nombre de colonnes « renseignées » sur la fiche : on compte, dans le
    -- JSONB de la ligne, les valeurs ni nulles ni chaînes vides, en excluant
    -- les colonnes techniques toujours présentes. Approche TOLÉRANTE AU SCHÉMA :
    -- on ne référence aucune colonne nominativement (hors id/created_at/
    -- company_name/status garanties), donc le script ne casse pas si le set de
    -- colonnes d'enrichissement varie d'un environnement à l'autre.
    (
      SELECT count(*)
      FROM jsonb_each_text(to_jsonb(p)) AS kv(k, v)
      WHERE kv.k NOT IN (
              'id', 'created_at', 'updated_at', 'synced_at',
              'notion_page_id', 'status', 'merged_into',
              'email_norm', 'phone_norm'
            )
        AND kv.v IS NOT NULL
        AND btrim(kv.v) <> ''
        AND kv.v <> '[]'        -- tableau text[] vide sérialisé
        AND kv.v <> '{}'
    ) AS filled_count
  FROM public.prospects p
),
-- Groupes d'entreprises homonymes comptant STRICTEMENT plus d'une fiche.
dup_groups AS (
  SELECT name_key
  FROM normalized
  WHERE name_key IS NOT NULL
  GROUP BY name_key
  HAVING count(*) > 1
),
-- Au sein de chaque groupe homonyme, on ordonne les fiches : la 1ère (rn = 1)
-- est le KEEPER, les suivantes sont des perdantes potentielles.
ranked AS (
  SELECT
    n.*,
    row_number() OVER (
      PARTITION BY n.name_key
      ORDER BY
        n.has_commission DESC,   -- 1. deal réel d'abord
        n.status_rank     DESC,  -- 2. fiche la plus vivante
        n.filled_count    DESC,  -- 3. fiche la plus renseignée
        n.created_at      ASC,   -- 4. la plus ancienne
        n.id              ASC    --    tie-break déterministe
    ) AS rn,
    first_value(n.id) OVER (
      PARTITION BY n.name_key
      ORDER BY
        n.has_commission DESC,
        n.status_rank     DESC,
        n.filled_count    DESC,
        n.created_at      ASC,
        n.id              ASC
    ) AS keeper_id
  FROM normalized n
  JOIN dup_groups g ON g.name_key = n.name_key
),
-- Perdants = toutes les fiches non-keeper d'un groupe homonyme, SAUF celles
-- qui portent une commission (anti-fusion financière : on garde les deux si
-- les deux ont une commission). Un perdant n'est jamais lui-même le keeper.
losers AS (
  SELECT id AS loser_id, keeper_id
  FROM ranked
  WHERE rn > 1
    AND has_commission = false
    AND id <> keeper_id
)

-- =====================================================================
-- 1. Matérialise les paires (perdant → keeper) dans une table temporaire.
-- =====================================================================
-- ON COMMIT DROP : disparaît à la fin de la transaction.
SELECT loser_id, keeper_id
INTO TEMP TABLE _dedup_pairs ON COMMIT DROP
FROM losers;

-- =====================================================================
-- 2. Ré-affecte les ENFANTS du perdant vers le keeper (avant DELETE).
-- =====================================================================
-- 2.a activities : préserve la timeline (appels, notes, status_change…).
UPDATE public.activities a
SET prospect_id = d.keeper_id
FROM _dedup_pairs d
WHERE a.prospect_id = d.loser_id;

-- 2.b tasks : préserve les relances planifiées.
UPDATE public.tasks t
SET prospect_id = d.keeper_id
FROM _dedup_pairs d
WHERE t.prospect_id = d.loser_id;

-- 2.c sequence_enrollments : préserve les inscriptions aux cadences.
UPDATE public.sequence_enrollments se
SET prospect_id = d.keeper_id
FROM _dedup_pairs d
WHERE se.prospect_id = d.loser_id;

-- 2.d quotes : préserve les devis (et leurs lignes via quote_id).
UPDATE public.quotes q
SET prospect_id = d.keeper_id
FROM _dedup_pairs d
WHERE q.prospect_id = d.loser_id;

-- 2.e commissions : ré-affecte au keeper (sécurité ; un perdant n'a pas de
--     commission par construction, mais on évite tout SET NULL accidentel).
UPDATE public.commissions c
SET prospect_id = d.keeper_id
FROM _dedup_pairs d
WHERE c.prospect_id = d.loser_id;

-- 2.f prospect_finance : 1-1 (PK = prospect_id). On déplace la ligne du
--     perdant vers le keeper UNIQUEMENT si le keeper n'en a pas déjà une.
--     Sinon on laisse CASCADE supprimer celle du perdant (le keeper, mieux
--     classé, porte déjà la valeur financière de référence).
UPDATE public.prospect_finance pf
SET prospect_id = d.keeper_id
FROM _dedup_pairs d
WHERE pf.prospect_id = d.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM public.prospect_finance pf2
    WHERE pf2.prospect_id = d.keeper_id
  );

-- =====================================================================
-- 3. DELETE des perdants (strictement scoppé aux paires matérialisées).
-- =====================================================================
-- Le CASCADE résiduel ne touche plus que des enfants déjà ré-affectés (donc
-- aucun) ou la ligne prospect_finance du perdant laissée en place en 2.f.
DELETE FROM public.prospects p
USING _dedup_pairs d
WHERE p.id = d.loser_id;

-- =====================================================================
-- 4. Supprime l'éventuelle fiche 100% vide (junk) — sans nom ni champ clé.
-- =====================================================================
-- Strictement les fiches SANS nom d'entreprise ET sans aucune donnée
-- identifiante (email/téléphone/contact/site). On EXCLUT toute fiche portant
-- une commission, un devis, une activité, une tâche, une séquence ou une ligne
-- financière (= du travail réel rattaché). Portée ultra-restreinte : en
-- pratique 0 ou 1 ligne.
DELETE FROM public.prospects p
WHERE nullif(btrim(coalesce(p.company_name, '')), '') IS NULL
  AND nullif(btrim(coalesce(p.contact_name, '')), '') IS NULL
  AND nullif(btrim(coalesce(p.email, '')), '') IS NULL
  AND nullif(btrim(coalesce(p.phone, '')), '') IS NULL
  AND nullif(btrim(coalesce(p.website, '')), '') IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.commissions c          WHERE c.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.quotes q               WHERE q.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.activities a           WHERE a.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.tasks t                WHERE t.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.sequence_enrollments s WHERE s.prospect_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.prospect_finance pf    WHERE pf.prospect_id = p.id);

-- =====================================================================
-- 5. Force le rechargement du schéma PostgREST.
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
