-- 0018 : nouveau role 'assistant' (assistante commerciale, ex. Grace).
--
-- Acces console RESTREINT : suivi equipe + relances (lecture du pipeline et du
-- suivi de toute l'equipe), JAMAIS le financier (CA / commissions / paliers) ni
-- la gestion des membres. L'enforcement applicatif vit dans src/lib/permissions.ts
-- + les gardes de pages ; cette migration ne fait qu'autoriser la valeur de role.
--
-- On reconcilie aussi le CHECK avec toutes les valeurs realement utilisees
-- (commercial, stagiaire) pour ne casser aucune ligne existante.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('commercial','freelance','admin','admin_limited','stagiaire','assistant'));

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_role_check
  CHECK (role IN ('commercial','freelance','admin','admin_limited','stagiaire','assistant'));
