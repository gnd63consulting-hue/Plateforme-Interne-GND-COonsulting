-- =============================================
-- 0011_add_notion_user_id_to_users.sql
-- =============================================
-- Plateforme Interne GND — Sync Notion people field :
--   Le champ Notion "Commercial assigné" est un people field (pas un
--   select). On stocke ici l'UUID workspace Notion de chaque user pour
--   matcher la valeur lue côté API Notion.
--
-- Migration purement additive (ALTER TABLE ADD COLUMN nullable + index
-- partiel). Aucune RLS policy modifiée. Safe à re-runner via IF NOT EXISTS.
--
-- ⚠️ Après avoir exécuté ce script, renseigner les 3 UUIDs Notion :
--    UPDATE public.users
--      SET notion_user_id = '<uuid-notion-de-hedi>'
--      WHERE email = 'hedi.galloub@gmail.com';
--    UPDATE public.users
--      SET notion_user_id = '<uuid-notion-d-alexis>'
--      WHERE email = '<email-alexis>';
--    UPDATE public.users
--      SET notion_user_id = '<uuid-notion-de-charles>'
--      WHERE email = 'charlesbrothier@gmail.com';
--
-- Pour récupérer un UUID Notion : ouvrir Notion API
--   GET https://api.notion.com/v1/users → liste des users du workspace
-- ou repérer via la propriété people d'une page existante.
-- =============================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notion_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_notion_user_id
  ON public.users(notion_user_id)
  WHERE notion_user_id IS NOT NULL;

COMMENT ON COLUMN public.users.notion_user_id IS
  'Notion workspace user UUID (Guest ou Member) pour matcher le people field "Commercial assigné" lu côté Notion API. À renseigner manuellement par admin via SQL UPDATE.';

NOTIFY pgrst, 'reload schema';

COMMIT;
