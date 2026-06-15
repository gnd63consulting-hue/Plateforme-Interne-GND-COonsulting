-- =============================================
-- 0012_crm_sprint1_activities_tasks.sql
-- =============================================
-- Plateforme Interne GND — CRM Sprint 1 (Relances) :
--   1. Table activities  — timeline polymorphe par prospect
--   2. Table tasks       — relances / tâches owner-scopées
--   3. Table audit_log   — journal append-only (admin only)
--   4. RLS owner-based + accès admin (réutilise is_admin_or_limited())
--   5. Trigger générique fn_audit() attaché sur public.prospects
--
-- ⚠️ ADDITIF — à exécuter manuellement dans le Supabase SQL editor.
--    Ne supprime rien, ne modifie aucune table/colonne existante.
--    Idempotent : safe à re-runner (IF NOT EXISTS, DROP POLICY IF EXISTS,
--    CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS).
-- =============================================

BEGIN;

-- =====================================================================
-- 1. Table activities — timeline polymorphe
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL
    CHECK (kind IN ('call','email','meeting','note','status_change','task')),
  body        TEXT,
  metadata    JSONB,
  owner_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_prospect_occurred_idx
  ON public.activities(prospect_id, occurred_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. Table tasks — relances / tâches commerciales
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_at      TIMESTAMPTZ,
  remind_at   TIMESTAMPTZ,
  done        BOOLEAN DEFAULT false,
  done_at     TIMESTAMPTZ,
  owner_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index partiel : récupération rapide des relances en attente d'un user.
CREATE INDEX IF NOT EXISTS tasks_owner_remind_pending_idx
  ON public.tasks(owner_id, remind_at)
  WHERE done = false;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. Table audit_log — journal append-only (rempli par trigger)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name  TEXT,
  record_id   TEXT,
  action      TEXT,
  actor_id    UUID,
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_table_record_idx
  ON public.audit_log(table_name, record_id, changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. RLS Policies
-- =====================================================================

-- -------- activities : owner-based + admin --------
DROP POLICY IF EXISTS "activities_owner_all" ON public.activities;
CREATE POLICY "activities_owner_all" ON public.activities
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "activities_admin_all" ON public.activities;
CREATE POLICY "activities_admin_all" ON public.activities
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- -------- tasks : owner-based + admin --------
DROP POLICY IF EXISTS "tasks_owner_all" ON public.tasks;
CREATE POLICY "tasks_owner_all" ON public.tasks
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL
  USING (public.is_admin_or_limited())
  WITH CHECK (public.is_admin_or_limited());

-- -------- audit_log : INSERT par trigger (security definer), SELECT admin --------
-- Aucune policy INSERT/UPDATE/DELETE pour les clients : seules les insertions
-- via fn_audit() (SECURITY DEFINER, bypass RLS) alimentent la table.
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT
  USING (public.is_admin_or_limited());

-- =====================================================================
-- 5. Trigger d'audit générique fn_audit()
-- =====================================================================
-- SECURITY DEFINER : écrit dans audit_log même si la policy client l'interdit.
-- Gère actor NULL proprement (ex. mutations service-role / cron sans session
-- auth → auth.uid() renvoie NULL, on logue actor_id = NULL).
CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor   UUID := auth.uid();          -- NULL si service-role / pas de session
  v_record  TEXT;
  v_old     JSONB;
  v_new     JSONB;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_record := OLD.id::text;
    v_old    := to_jsonb(OLD);
    v_new    := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_record := NEW.id::text;
    v_old    := to_jsonb(OLD);
    v_new    := to_jsonb(NEW);
  ELSE -- INSERT
    v_record := NEW.id::text;
    v_old    := NULL;
    v_new    := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_log
    (table_name, record_id, action, actor_id, old_data, new_data)
  VALUES
    (TG_TABLE_NAME, v_record, TG_OP, v_actor, v_old, v_new);

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attache le trigger d'audit sur public.prospects (toutes opérations).
DROP TRIGGER IF EXISTS prospects_audit ON public.prospects;
CREATE TRIGGER prospects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- =====================================================================
-- 6. Force PostgREST schema reload
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
