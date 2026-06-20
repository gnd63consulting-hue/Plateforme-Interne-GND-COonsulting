-- =============================================
-- GND Formation Commerciaux — Status default change
-- =============================================
-- 1. Default 'prospecte' -> 'a_contacter' (the truthful "not yet contacted")
-- 2. Bulk update existing rows with the legacy default
--
-- Rationale: 'prospecte' is misleading. In French sales context, "prospecte"
-- means "deja prospecte/contacte", not "present dans le pipeline". The column
-- was actually used as the initial state. Switching to 'a_contacter' aligns
-- the label with reality.
--
-- Idempotent. Safe to re-run.
-- =============================================

-- =============================================
-- RECONCILIATION FR -> EN (replay-safe)  [ajoute pour la CI]
-- =============================================
-- Contexte : en PROD la table public.prospects a ete renommee a la main du
-- schema FR (0001 : nom/telephone/ville/statut/...) vers le schema EN attendu
-- par le code (company_name/phone/city/status/...). Ce rename N'A JAMAIS ete
-- versionne. Sur une base VIERGE rejouee depuis le repo (CI db reset), les
-- colonnes portent donc encore leurs noms FR, et 0008 (puis 0013/0023/0025/...)
-- referencent les noms EN -> ERROR 42703 "column ... does not exist".
--
-- Ce bloc reconcilie le schema AVANT toute reference EN. Pour chaque colonne :
--   - si le nom FR existe et le nom EN n'existe pas  -> RENAME FR -> EN
--   - sinon si le nom EN n'existe pas                -> ADD COLUMN EN
--   - sinon (EN deja present, cas PROD)              -> no-op total
-- Resultat : etat final identique a la PROD (schema EN), aucune perte de
-- donnee, aucun changement d'intention. 100% idempotent.
--
-- Place ici parce que 0008 est la PREMIERE migration a referencer une colonne
-- EN (`status`). Les colonnes EN suivantes (phone en 0013 ; company_name/
-- contact_name/website en 0023 ; city/sector/postal_code en 0025) sont elles
-- aussi reconciliees ici, en amont de leur premiere reference.
DO $$
DECLARE
  -- mapping FR -> EN ; type EN cible utilise seulement pour le cas ADD.
  r RECORD;
BEGIN
  -- S'assure que la table existe (par securite ; 0001/0005 l'ont deja creee).
  CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );

  FOR r IN
    SELECT * FROM (VALUES
      ('nom',              'company_name', 'TEXT'),
      ('telephone',        'phone',        'TEXT'),
      ('ville',            'city',         'TEXT'),
      ('site_web',         'website',      'TEXT'),
      ('secteur_activite', 'sector',       'TEXT'),
      ('statut',           'status',       'TEXT')
    ) AS m(fr, en, typ)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prospects' AND column_name = r.fr
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prospects' AND column_name = r.en
    ) THEN
      EXECUTE format('ALTER TABLE public.prospects RENAME COLUMN %I TO %I;', r.fr, r.en);
    ELSIF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prospects' AND column_name = r.en
    ) THEN
      EXECUTE format('ALTER TABLE public.prospects ADD COLUMN %I %s;', r.en, r.typ);
    END IF;
  END LOOP;

  -- Colonnes EN PUREMENT NOUVELLES en prod (aucune source FR a renommer).
  -- ADD COLUMN IF NOT EXISTS = no-op en prod, cree la colonne sur base vierge.
  ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS contact_name TEXT;
  ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS postal_code  TEXT;
END $$;

-- La CHECK FR `prospects_statut_check` (posee par 0001/0005) reference la
-- colonne renommee : Postgres la suit automatiquement lors du RENAME, mais son
-- nom reste `prospects_statut_check`. On la laisse telle quelle (elle contraint
-- toujours les memes valeurs sur la colonne desormais nommee `status`) pour ne
-- pas changer l'etat final cote PROD ou elle peut deja ne plus exister.

-- =============================================
-- (corps original 0008)
-- =============================================

-- Change column default for new INSERTs
ALTER TABLE public.prospects
  ALTER COLUMN status SET DEFAULT 'a_contacter';

-- Retag existing rows that still bear the legacy default
UPDATE public.prospects
SET status = 'a_contacter'
WHERE status = 'prospecte';

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Vérif post-migration
SELECT status, COUNT(*) AS nb
FROM public.prospects
GROUP BY status
ORDER BY nb DESC;
