-- 0019 : acces prospects + activites pour le role 'assistant' (assistante
-- commerciale, ex. Grace).
--
-- L'assistant LIT + EDITE les prospects de TOUTE l'equipe et voit/loggue les
-- activites (suivi + mise a jour du pipeline). Le masquage des MONTANTS
-- (CA / commission) reste applicatif (UI) en v1 ; un durcissement colonne/vue
-- suivra. Helper SECURITY DEFINER (bypass RLS sur users, anti-recursion), meme
-- pattern que public.is_admin().
CREATE OR REPLACE FUNCTION public.is_assistant()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'assistant'
  );
$$;

-- prospects : lecture + edition de toute l'equipe
DROP POLICY IF EXISTS "prospects_assistant_read" ON public.prospects;
CREATE POLICY "prospects_assistant_read" ON public.prospects
  FOR SELECT USING (public.is_assistant());

DROP POLICY IF EXISTS "prospects_assistant_update" ON public.prospects;
CREATE POLICY "prospects_assistant_update" ON public.prospects
  FOR UPDATE USING (public.is_assistant()) WITH CHECK (public.is_assistant());

-- activities : voir la timeline + logguer ses actions
DROP POLICY IF EXISTS "activities_assistant_read" ON public.activities;
CREATE POLICY "activities_assistant_read" ON public.activities
  FOR SELECT USING (public.is_assistant());

DROP POLICY IF EXISTS "activities_assistant_insert" ON public.activities;
CREATE POLICY "activities_assistant_insert" ON public.activities
  FOR INSERT WITH CHECK (public.is_assistant());
