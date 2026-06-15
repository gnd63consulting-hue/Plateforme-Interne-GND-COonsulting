-- =============================================
-- 0014_sequences.sql
-- =============================================
-- Plateforme Interne GND — CRM Sprint 7 (Séquences de relance) :
--   1. Table sequences         — bibliothèque de cadences (modèles partagés)
--   2. Table sequence_steps    — étapes ordonnées d'une séquence
--   3. Table sequence_enrollments — inscriptions d'un prospect à une séquence
--   4. RLS :
--        - sequences / sequence_steps : SELECT pour tout authenticated
--          (bibliothèque partagée), écriture réservée admin
--          (is_admin_or_limited(), cf. 0009)
--        - sequence_enrollments : owner-based (owner_id = auth.uid()) + admin
--
-- MVP retenu : PAS d'envoi email auto. Une séquence est une suite d'étapes
-- datées dont le moteur cron (/api/sequences/tick) génère des TÂCHES
-- (public.tasks, migration 0012) et pose prospects.next_action_at. Le
-- commercial exécute la tâche manuellement.
--
-- ⚠️ ADDITIF — à exécuter MANUELLEMENT dans le Supabase SQL editor.
--    Ne supprime rien, ne modifie aucune table/colonne existante.
--    Idempotent : safe à re-runner (CREATE TABLE IF NOT EXISTS,
--    CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS).
--
-- Sémantique de delay_days (IMPORTANT) :
--    delay_days est le délai en jours « DEPUIS L'ÉTAPE PRÉCÉDENTE » (relatif),
--    PAS cumulatif depuis l'inscription. Pour l'étape 1 (position 0), le délai
--    est compté depuis la date d'inscription. Exemple : étapes à
--    [0, 2, 3] jours → tâches générées à J+0, J+2, puis J+5 (2+3) après
--    l'inscription. Le moteur calcule next_due_at = now() + delay de l'étape
--    SUIVANTE à chaque avancement, ce qui rend ce délai naturellement relatif.
-- =============================================

BEGIN;

-- =====================================================================
-- 1. Table sequences — bibliothèque de cadences (modèles partagés)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. Table sequence_steps — étapes ordonnées d'une séquence
-- =====================================================================
-- position      : index 0-based de l'étape dans la séquence.
-- kind          : nature de l'action générée (call/email/linkedin/task/note).
-- delay_days    : délai en jours DEPUIS L'ÉTAPE PRÉCÉDENTE (cf. en-tête).
-- title         : intitulé de la tâche générée.
-- template_body : corps / script suggéré (copié dans la tâche / réutilisable).
CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  position      INT NOT NULL,
  kind          TEXT NOT NULL
    CHECK (kind IN ('call','email','linkedin','task','note')),
  delay_days    INT NOT NULL DEFAULT 0,
  title         TEXT NOT NULL,
  template_body TEXT
);

CREATE INDEX IF NOT EXISTS sequence_steps_sequence_position_idx
  ON public.sequence_steps(sequence_id, position);

ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. Table sequence_enrollments — inscription d'un prospect à une séquence
-- =====================================================================
-- current_step : position de la PROCHAINE étape à déclencher (0-based).
-- status       : active | paused | done | stopped.
-- next_due_at  : date de déclenchement de l'étape current_step. NULL quand
--                terminé / arrêté.
-- owner_id     : commercial responsable de l'inscription (RLS).
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id  UUID NOT NULL REFERENCES public.sequences(id),
  prospect_id  UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','done','stopped')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_due_at  TIMESTAMPTZ,
  owner_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index moteur cron : balayage rapide des inscriptions actives échues.
CREATE INDEX IF NOT EXISTS sequence_enrollments_status_due_idx
  ON public.sequence_enrollments(status, next_due_at);

-- Index fiche 360 : enrollment(s) d'un prospect donné.
CREATE INDEX IF NOT EXISTS sequence_enrollments_prospect_idx
  ON public.sequence_enrollments(prospect_id);

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. RLS Policies
-- =====================================================================

-- -------- sequences : SELECT tout authenticated, écriture admin ----------
-- Bibliothèque de modèles partagée : tout le monde lit (pour s'inscrire),
-- seuls les admins créent / éditent / suppriment.
DROP POLICY IF EXISTS "sequences_select_authenticated" ON public.sequences;
CREATE POLICY "sequences_select_authenticated" ON public.sequences
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "sequences_insert_admin" ON public.sequences;
CREATE POLICY "sequences_insert_admin" ON public.sequences
  FOR INSERT
  WITH CHECK (public.is_admin_or_limited());

DROP POLICY IF EXISTS "sequences_update_admin" ON public.sequences;
CREATE POLICY "sequences_update_admin" ON public.sequences
  FOR UPDATE
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

DROP POLICY IF EXISTS "sequences_delete_admin" ON public.sequences;
CREATE POLICY "sequences_delete_admin" ON public.sequences
  FOR DELETE
  USING (public.is_admin_or_limited());

-- -------- sequence_steps : SELECT tout authenticated, écriture admin ------
DROP POLICY IF EXISTS "sequence_steps_select_authenticated" ON public.sequence_steps;
CREATE POLICY "sequence_steps_select_authenticated" ON public.sequence_steps
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "sequence_steps_insert_admin" ON public.sequence_steps;
CREATE POLICY "sequence_steps_insert_admin" ON public.sequence_steps
  FOR INSERT
  WITH CHECK (public.is_admin_or_limited());

DROP POLICY IF EXISTS "sequence_steps_update_admin" ON public.sequence_steps;
CREATE POLICY "sequence_steps_update_admin" ON public.sequence_steps
  FOR UPDATE
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

DROP POLICY IF EXISTS "sequence_steps_delete_admin" ON public.sequence_steps;
CREATE POLICY "sequence_steps_delete_admin" ON public.sequence_steps
  FOR DELETE
  USING (public.is_admin_or_limited());

-- -------- sequence_enrollments : owner-based + admin ---------------------
DROP POLICY IF EXISTS "sequence_enrollments_owner_all" ON public.sequence_enrollments;
CREATE POLICY "sequence_enrollments_owner_all" ON public.sequence_enrollments
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "sequence_enrollments_admin_all" ON public.sequence_enrollments;
CREATE POLICY "sequence_enrollments_admin_all" ON public.sequence_enrollments
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- =====================================================================
-- 5. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
