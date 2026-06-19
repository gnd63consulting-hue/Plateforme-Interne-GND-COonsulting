-- =============================================
-- 0035_mockups_read.sql  (GND CRM — galerie maquettes lisible par les commerciaux)
-- site_mockups : lecture pour tout utilisateur authentifie (galerie + lien
-- dans les Drafts). Les maquettes sont des sites de demo publics, rien de
-- sensible. 100% idempotent. A executer manuellement.
-- =============================================

BEGIN;

DROP POLICY IF EXISTS "site_mockups_auth_read" ON public.site_mockups;
CREATE POLICY "site_mockups_auth_read" ON public.site_mockups FOR SELECT
  TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';

COMMIT;
