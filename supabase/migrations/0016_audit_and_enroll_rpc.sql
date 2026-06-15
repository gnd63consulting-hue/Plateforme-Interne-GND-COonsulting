-- =============================================
-- 0016_audit_and_enroll_rpc.sql
-- =============================================
-- Plateforme Interne GND — CRM Sprint 9 (Fiabilisation traçabilité) :
--
--   A. Étend le trigger d'audit générique public.fn_audit() (migration 0012)
--      à TOUTES les tables d'écriture commerciales : activities, tasks,
--      commissions, quotes, quote_lines, sequence_enrollments. La trace
--      old/new devient garantie côté Postgres, indépendamment du client
--      (plus aucun « échec silencieux » d'historique : même une écriture
--      service-role ou un client qui oublie de loguer laisse une trace dans
--      audit_log).
--
--   B. RPC transactionnelle public.fn_enroll_sequence(prospect, sequence) :
--      inscription d'un prospect à une séquence en UNE seule transaction
--      atomique (enrollment + 1ʳᵉ tâche éventuelle + next_action_at +
--      activity), avec contrôle d'autorisation interne et idempotence. Remplace
--      la cascade de 5+ écritures client (non atomique, fire-and-forget) du
--      SequenceEnrollPanel.
--
--   C. NOTIFY pgrst — recharge le schéma PostgREST (expose la nouvelle RPC).
--
-- ⚠️ ADDITIF — à exécuter MANUELLEMENT dans le Supabase SQL editor.
--    Ne supprime rien, ne modifie aucune table/colonne existante.
--    Idempotent : safe à re-runner (DROP TRIGGER IF EXISTS + CREATE TRIGGER,
--    CREATE OR REPLACE FUNCTION). Réutilise les objets existants :
--      - public.fn_audit()           (trigger générique, migration 0012)
--      - public.audit_log            (journal append-only, migration 0012)
--      - public.is_admin_or_limited()(helper rôle, migration 0009)
--
-- Note fn_audit() : la fonction lit NEW.id / OLD.id. Les six tables ciblées
-- ont toutes une PK `id` (uuid ou bigint) → compatible sans modification.
-- =============================================

BEGIN;

-- =====================================================================
-- A. Étendre l'audit générique à toutes les tables d'écriture
-- =====================================================================
-- Chaque trigger AFTER INSERT/UPDATE/DELETE délègue à public.fn_audit()
-- (SECURITY DEFINER, déjà défini en 0012). DROP IF EXISTS d'abord → re-run sûr.

-- -------- activities --------
DROP TRIGGER IF EXISTS activities_audit ON public.activities;
CREATE TRIGGER activities_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- -------- tasks --------
DROP TRIGGER IF EXISTS tasks_audit ON public.tasks;
CREATE TRIGGER tasks_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- -------- commissions --------
DROP TRIGGER IF EXISTS commissions_audit ON public.commissions;
CREATE TRIGGER commissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- -------- quotes --------
DROP TRIGGER IF EXISTS quotes_audit ON public.quotes;
CREATE TRIGGER quotes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- -------- quote_lines --------
DROP TRIGGER IF EXISTS quote_lines_audit ON public.quote_lines;
CREATE TRIGGER quote_lines_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- -------- sequence_enrollments --------
DROP TRIGGER IF EXISTS sequence_enrollments_audit ON public.sequence_enrollments;
CREATE TRIGGER sequence_enrollments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- =====================================================================
-- B. RPC transactionnelle d'inscription à une séquence
-- =====================================================================
-- public.fn_enroll_sequence(p_prospect_id, p_sequence_id) → jsonb (l'enrollment)
--
-- SECURITY DEFINER : tourne avec les droits du owner de la fonction (bypass
-- RLS) MAIS effectue un contrôle d'autorisation EXPLICITE en tête : l'appelant
-- doit être propriétaire du prospect (created_by/assigned_to) OU admin. Sinon
-- EXCEPTION → la transaction est rollback, rien n'est écrit.
--
-- Atomicité : enrollment + (si étape 1 due immédiatement) tâche + activity +
-- prospects.next_action_at sont écrits dans la MÊME transaction. Un échec à
-- n'importe quelle étape annule tout (pas d'enrollment orphelin, pas de tâche
-- sans trace).
--
-- Idempotence : si un enrollment 'active' existe déjà pour (prospect, séquence),
-- on le renvoie tel quel sans rien créer (pas de doublon).
--
-- owner_id de l'enrollment / de la tâche = assigned_to ?? created_by du
-- prospect (le commercial responsable), aligné sur la logique client existante.
CREATE OR REPLACE FUNCTION public.fn_enroll_sequence(
  p_prospect_id uuid,
  p_sequence_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_is_admin     boolean := public.is_admin_or_limited();
  v_created_by   uuid;
  v_assigned_to  uuid;
  v_owner        uuid;
  v_existing     public.sequence_enrollments%ROWTYPE;
  v_enr          public.sequence_enrollments%ROWTYPE;
  v_step1        public.sequence_steps%ROWTYPE;
  v_step2_delay  int;
  v_now          timestamptz := now();
  v_first_due    timestamptz;
  v_task_title   text;
  v_step1_found  boolean := false;
BEGIN
  -- 0. Garde-fous d'arguments.
  IF p_prospect_id IS NULL OR p_sequence_id IS NULL THEN
    RAISE EXCEPTION 'prospect_id et sequence_id sont requis.'
      USING ERRCODE = '22023';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.'
      USING ERRCODE = '28000';
  END IF;

  -- 1. Charge le prospect (existence + propriétaires) et contrôle l'accès.
  SELECT created_by, assigned_to
    INTO v_created_by, v_assigned_to
    FROM public.prospects
   WHERE id = p_prospect_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect introuvable.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (v_is_admin OR v_uid = v_created_by OR v_uid = v_assigned_to) THEN
    RAISE EXCEPTION 'Non autorisé sur ce prospect.'
      USING ERRCODE = '42501';
  END IF;

  -- owner_id de l'inscription = commercial responsable (assigned_to en priorité).
  v_owner := COALESCE(v_assigned_to, v_created_by);

  -- 2. Idempotence : un enrollment 'active' existe déjà pour ce couple ?
  SELECT *
    INTO v_existing
    FROM public.sequence_enrollments
   WHERE prospect_id = p_prospect_id
     AND sequence_id = p_sequence_id
     AND status = 'active'
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    RETURN to_jsonb(v_existing);
  END IF;

  -- 3. Récupère l'étape 1 (position 0) pour calculer la 1ʳᵉ échéance.
  SELECT *
    INTO v_step1
    FROM public.sequence_steps
   WHERE sequence_id = p_sequence_id
     AND position = 0
   ORDER BY position
   LIMIT 1;
  v_step1_found := FOUND;

  IF NOT v_step1_found THEN
    RAISE EXCEPTION 'Cette séquence n''a pas encore d''étape.'
      USING ERRCODE = 'P0002';
  END IF;

  -- next_due_at de l'étape 1 = now + delay de l'étape 1 (delay relatif, borné ≥ 0).
  v_first_due := v_now + (GREATEST(COALESCE(v_step1.delay_days, 0), 0) || ' days')::interval;

  -- 4. Crée l'inscription. owner_id forcé au commercial responsable (la RPC est
  --    SECURITY DEFINER : auth.uid() pourrait être un admin clôturant pour
  --    autrui, donc on ne s'appuie pas sur le DEFAULT auth.uid()).
  INSERT INTO public.sequence_enrollments
    (sequence_id, prospect_id, current_step, status, next_due_at, owner_id)
  VALUES
    (p_sequence_id, p_prospect_id, 0, 'active', v_first_due, v_owner)
  RETURNING * INTO v_enr;

  -- 5. Si l'étape 1 est due immédiatement (delay 0), matérialise-la dans la
  --    même transaction : tâche + activity + prospects.next_action_at, puis
  --    avance l'inscription vers l'étape 2 (ou clôture si pas d'étape 2).
  IF COALESCE(v_step1.delay_days, 0) <= 0 THEN
    v_task_title := COALESCE(NULLIF(v_step1.kind, ''), 'task') || ' — ' || v_step1.title;

    -- Tâche initiale (due maintenant), owner = commercial responsable.
    INSERT INTO public.tasks (prospect_id, title, due_at, remind_at, owner_id)
    VALUES (p_prospect_id, v_task_title, v_now, v_now, v_owner);

    -- next_action_at sur le prospect (relance visible tout de suite).
    UPDATE public.prospects
       SET next_action_at = v_now
     WHERE id = p_prospect_id;

    -- Trace timeline (kind='task'). owner_id = commercial responsable.
    INSERT INTO public.activities (prospect_id, kind, body, metadata, owner_id)
    VALUES (
      p_prospect_id,
      'task',
      CASE
        WHEN v_step1.template_body IS NOT NULL AND v_step1.template_body <> ''
          THEN 'Étape séquence déclenchée : ' || v_task_title || E'\n\n' || v_step1.template_body
        ELSE 'Étape séquence déclenchée : ' || v_task_title
      END,
      jsonb_build_object(
        'sequence_id',   p_sequence_id,
        'enrollment_id', v_enr.id,
        'step_position', 0,
        'step_kind',     v_step1.kind
      ),
      v_owner
    );

    -- Avance vers l'étape 2 (position 1) si elle existe, sinon clôture.
    SELECT delay_days
      INTO v_step2_delay
      FROM public.sequence_steps
     WHERE sequence_id = p_sequence_id
       AND position = 1
     ORDER BY position
     LIMIT 1;

    IF FOUND THEN
      UPDATE public.sequence_enrollments
         SET current_step = 1,
             next_due_at = v_now + (GREATEST(COALESCE(v_step2_delay, 0), 0) || ' days')::interval
       WHERE id = v_enr.id
      RETURNING * INTO v_enr;
    ELSE
      UPDATE public.sequence_enrollments
         SET current_step = 1, status = 'done', next_due_at = NULL
       WHERE id = v_enr.id
      RETURNING * INTO v_enr;
    END IF;
  END IF;

  RETURN to_jsonb(v_enr);
END;
$$;

-- L'appelant authentifié (client anon) peut exécuter la RPC. Le contrôle
-- d'accès fin est fait DANS la fonction (owner du prospect OU admin).
GRANT EXECUTE ON FUNCTION public.fn_enroll_sequence(uuid, uuid) TO authenticated;

-- =====================================================================
-- C. Force PostgREST schema reload (expose la RPC + recharge les triggers)
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
