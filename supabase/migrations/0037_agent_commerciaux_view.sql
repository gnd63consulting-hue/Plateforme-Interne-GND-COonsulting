-- =============================================
-- 0037_agent_commerciaux_view.sql  (GND CRM — routing dynamique Hestia)
-- Vue scopee des commerciaux ACTIFS pour qu'Hestia (agent_sales_ops) reparte
-- les prospects non-assignes en round-robin SANS hardcode. Expose seulement
-- id/full_name/role/active (jamais email/finance). 100% idempotent.
-- =============================================

BEGIN;

CREATE OR REPLACE VIEW public.v_agent_commerciaux AS
SELECT u.id, u.full_name, u.role, u.active
FROM public.users u
WHERE u.role = 'freelance'
  AND u.active IS NOT FALSE;
COMMENT ON VIEW public.v_agent_commerciaux IS
  'Commerciaux actifs (role freelance) pour le routing Hestia. id/nom/role/active uniquement, aucun email/finance. Un nouveau commercial actif y apparait automatiquement. Cf. 0037.';

REVOKE ALL ON public.v_agent_commerciaux FROM PUBLIC;
GRANT SELECT ON public.v_agent_commerciaux TO agent_sales_ops;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICATION
SELECT has_table_privilege('agent_sales_ops','public.v_agent_commerciaux','SELECT') AS hestia_read_ok;
SELECT * FROM public.v_agent_commerciaux ORDER BY full_name;
