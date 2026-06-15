-- 0020 : permissions granulaires par section (RBAC v2).
--
-- Colonne `permissions` (jsonb) = OVERRIDE par personne des autorisations
-- deduites du role. Format : { "pipeline": "edit", "finance": "none", ... }
-- ou les valeurs sont 'none' | 'view' | 'edit'. NULL/vide => on applique le
-- preset du role (cf. src/lib/permissions.ts). Aucune perte : tant que personne
-- n'override, le comportement reste celui des roles.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb;
