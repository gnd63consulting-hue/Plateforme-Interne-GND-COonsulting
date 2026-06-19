-- =============================================
-- 0038_route_prospect_fn.sql  (GND CRM — routing Hestia securise)
-- fn_route_prospect : assigne un prospect NON-assigne a un commercial ACTIF.
-- Regles de securite encodees DANS la base (SECURITY DEFINER) :
--   - refuse si le prospect est deja assigne (protege les attributions
--     manuelles de Roodny/Jean) ;
--   - refuse si le commercial n'est pas actif (v_agent_commerciaux) ;
--   - atomique (AND assigned_to IS NULL) = anti-collision.
-- Hestia (agent_sales_ops) ne recoit que EXECUTE : aucun acces direct a
-- prospects, cloisonnement preserve. 100% idempotent. A executer manuellement.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_route_prospect(
  p_prospect_id   uuid,
  p_commercial_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current uuid;
  v_active  boolean;
BEGIN
  -- 1. Le commercial cible doit etre un commercial ACTIF.
  SELECT true INTO v_active FROM public.v_agent_commerciaux WHERE id = p_commercial_id;
  IF NOT FOUND THEN
    RETURN 'skip:commercial_inactif';
  END IF;

  -- 2. Le prospect doit exister et etre NON assigne (protege les attributions manuelles).
  SELECT assigned_to INTO v_current FROM public.prospects WHERE id = p_prospect_id;
  IF NOT FOUND THEN
    RETURN 'skip:prospect_introuvable';
  END IF;
  IF v_current IS NOT NULL THEN
    RETURN 'skip:deja_assigne';
  END IF;

  -- 3. Assignation atomique (la condition assigned_to IS NULL evite toute collision).
  UPDATE public.prospects
  SET assigned_to = p_commercial_id
  WHERE id = p_prospect_id AND assigned_to IS NULL;

  IF FOUND THEN
    RETURN 'ok';
  ELSE
    RETURN 'skip:deja_assigne';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.fn_route_prospect(uuid, uuid) IS
  'Routing Hestia : assigne un prospect NON-assigne a un commercial actif. Refuse les reassignations (attributions manuelles protegees). EXECUTE accorde a agent_sales_ops uniquement. Cf. 0038.';

REVOKE ALL ON FUNCTION public.fn_route_prospect(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_route_prospect(uuid, uuid) TO agent_sales_ops;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION
SELECT has_function_privilege('agent_sales_ops','public.fn_route_prospect(uuid,uuid)','EXECUTE') AS hestia_execute_ok;
