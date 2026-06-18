-- =============================================
-- 0028_prospect_intel_ui_read.sql  (GND CRM)
-- Lecture UI de l'intel d'enrichissement par les commerciaux.
-- =============================================
-- Avant : prospect_intel n'avait que la policy admin (is_admin_or_limited) +
--   les policies des roles agent_*. Donc un commercial (role authenticated,
--   non-admin) recevait 0 ligne -> il ne voyait PAS l'enrichissement Atlas.
--
-- Cette policy autorise un utilisateur authentifie a LIRE l'intel d'un prospect
-- qu'il peut DEJA voir via la RLS owner-based de `prospects`. La sous-requete
-- `SELECT p.id FROM public.prospects p` est elle-meme soumise a la RLS de
-- prospects -> un commercial ne recupere QUE l'intel de SES prospects
-- (assigned_to / created_by) ; l'admin voit deja tout via la policy existante.
--
-- SECURITE : aucun acces financier ici. prospect_intel ne contient pas de
--   deal_amount (le montant vit dans prospect_finance, RLS admin-only, 0021).
--   On n'ouvre que la LECTURE (SELECT). Ecriture reservee a agent_enrichisseur
--   (connexion directe) et a l'admin.
--
-- Append-only : Atlas peut ecrire plusieurs lignes par prospect (historique) ;
--   l'app lit la ligne la plus recente (cf. src/lib/prospect-intel.ts).
--
-- ADDITIF · idempotent · a executer dans le Supabase SQL editor.
-- =============================================

BEGIN;

DROP POLICY IF EXISTS "prospect_intel_ui_owner_select" ON public.prospect_intel;
CREATE POLICY "prospect_intel_ui_owner_select" ON public.prospect_intel FOR SELECT
  TO authenticated
  USING (
    prospect_id IN (SELECT p.id FROM public.prospects p)
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
