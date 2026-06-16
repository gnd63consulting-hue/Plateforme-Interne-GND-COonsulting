-- =============================================
-- 0024_pipelines.sql
-- =============================================
-- Plateforme Interne GND — MULTI-PIPELINE (Phase 1) :
--   Permettre aux admins de gerer PLUSIEURS pipelines (lignes de metier :
--   Sites web / Mariage / Audiovisuel) et de filtrer le tableau prospects par
--   pipeline. Les STAGES (colonnes Kanban) restent STRICTEMENT identiques a
--   aujourd'hui — ils ne deviennent PAS dynamiques (ce sera la Phase 2).
--
--   1. Table public.pipelines (lignes de metier, ordonnees, defaut).
--   2. Seed d'UN pipeline par defaut ('Commercial — Sites web', is_default).
--   3. prospects.pipeline_id (nullable, FK pipelines) + backfill de TOUTES les
--      fiches existantes vers le pipeline par defaut.
--   4. RLS pipelines : SELECT pour tout authentifie ; INSERT/UPDATE/DELETE
--      reserves a is_admin_or_limited() (meme style que prospect_finance 0021).
--   5. Index unique partiel : au plus UN pipeline is_default = true.
--
-- ⚠️ ADDITIF — a executer MANUELLEMENT dans le Supabase SQL editor.
--    Ne supprime rien, ne modifie aucune colonne existante (ajoute seulement
--    prospects.pipeline_id, nullable). IDEMPOTENT : safe a re-runner
--    (IF NOT EXISTS / ON CONFLICT DO NOTHING / DROP POLICY IF EXISTS /
--    blocs DO gardes). Re-runner ne cree PAS de second pipeline par defaut et
--    ne re-backfill que les fiches encore NULL.
--
--    COMPAT TOTALE : avec un seul pipeline (le defaut), le comportement de la
--    plateforme est IDENTIQUE a aujourd'hui — toutes les fiches pointent vers
--    ce pipeline, le selecteur est masque cote UI, le Kanban/reporting/sync/
--    mirror/dedup/commissions ne lisent PAS pipeline_id et restent inchanges.
--
--    Ordre de cutover : EXECUTER CE SQL D'ABORD, puis deployer le code. Tant
--    que le SQL n'est pas passe, le code deploye lirait une colonne/table
--    absente — donc SQL avant deploy (cf. notes de cutover du rapport).
-- =============================================

BEGIN;

-- =====================================================================
-- 1. Table pipelines — lignes de metier (boards)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pipelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.pipelines IS
  'Lignes de metier (boards) pour le pipeline commercial. Phase 1 multi-pipeline : les STAGES restent statiques (src/lib/pipeline.ts), seuls les boards sont multiples. Cf. migration 0024.';
COMMENT ON COLUMN public.pipelines.is_default IS
  'Pipeline par defaut : recoit les nouvelles fiches sans pipeline_id et sert de filtre initial du board. Au plus un seul a true (index partiel pipelines_one_default_idx).';
COMMENT ON COLUMN public.pipelines.position IS
  'Ordre d''affichage du selecteur (asc). Plus petit = en premier.';
COMMENT ON COLUMN public.pipelines.color IS
  'Pastille couleur optionnelle (hex) pour le selecteur. Purement cosmetique.';

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Au plus UN pipeline par defaut. Index partiel unique : la contrainte ne porte
-- que sur les lignes is_default = true. Idempotent (IF NOT EXISTS).
CREATE UNIQUE INDEX IF NOT EXISTS pipelines_one_default_idx
  ON public.pipelines (is_default)
  WHERE is_default;

CREATE INDEX IF NOT EXISTS pipelines_position_idx
  ON public.pipelines (position, created_at);

-- =====================================================================
-- 2. Seed d'UN pipeline par defaut + 3. ajout colonne + backfill
-- =====================================================================
-- Bloc DO : on capture l'id du pipeline par defaut (cree si absent) pour
-- backfill prospects.pipeline_id. Tout est garde / re-runnable.
DO $$
DECLARE
  v_default_id UUID;
BEGIN
  -- 2.a — pipeline par defaut : on le cree UNE seule fois. Re-run : si un
  -- pipeline is_default existe deja, on le reutilise (pas de doublon).
  SELECT id INTO v_default_id
  FROM public.pipelines
  WHERE is_default = true
  ORDER BY position, created_at
  LIMIT 1;

  IF v_default_id IS NULL THEN
    INSERT INTO public.pipelines (name, position, is_default, color)
    VALUES ('Commercial — Sites web', 0, true, '#F39253')
    RETURNING id INTO v_default_id;
  END IF;

  -- 3.a — colonne prospects.pipeline_id (nullable, FK pipelines). ADD COLUMN
  -- IF NOT EXISTS rend l'operation re-runnable et non destructive.
  ALTER TABLE public.prospects
    ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.pipelines(id);

  -- 3.b — backfill : TOUTES les fiches encore sans pipeline pointent vers le
  -- defaut. Re-run : seules les lignes encore NULL sont touchees → idempotent.
  UPDATE public.prospects
  SET pipeline_id = v_default_id
  WHERE pipeline_id IS NULL;
END $$;

COMMENT ON COLUMN public.prospects.pipeline_id IS
  'Ligne de metier (board) du prospect. Nullable : une fiche sans pipeline est traitee comme appartenant au pipeline par defaut cote app. Backfill 0024 : toutes les fiches existantes rattachees au defaut. Le sync Notion pose le defaut sur les nouveaux INSERT.';

CREATE INDEX IF NOT EXISTS prospects_pipeline_id_idx
  ON public.prospects (pipeline_id);

-- =====================================================================
-- 4. RLS pipelines — lecture pour tout authentifie, ecriture admin only
-- =====================================================================
-- Style aligne sur prospect_finance (0021) / commissions (0015) :
--   - SELECT : tout utilisateur authentifie (le selecteur de board doit etre
--     visible par les commerciaux/assistants ; aucun montant n'y transite).
--   - INSERT/UPDATE/DELETE : is_admin_or_limited() uniquement (gestion des
--     lignes de metier = prerogative admin, comme /admin/commissions).
DROP POLICY IF EXISTS "pipelines_select_authenticated" ON public.pipelines;
CREATE POLICY "pipelines_select_authenticated" ON public.pipelines
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "pipelines_admin_write" ON public.pipelines;
CREATE POLICY "pipelines_admin_write" ON public.pipelines
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- =====================================================================
-- 5. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
