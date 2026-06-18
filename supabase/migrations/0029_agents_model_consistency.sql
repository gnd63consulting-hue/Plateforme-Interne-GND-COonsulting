-- =============================================
-- 0029_agents_model_consistency.sql  (GND CRM — Hermes, decision A1)
-- ADDITIF. Aligne public.agents.model sur la decision A1 :
--   TOUS les agents tournent sur gpt-5.4 (Codex / abonnement ChatGPT Plus).
-- Les seeds 0025/0026/0027 portaient 'claude-sonnet' par erreur de prise de
-- notes. Aucun agent n'utilise Claude. La colonne `model` n'alimente que
-- l'affichage du dashboard /admin/agents (aucun effet runtime).
-- A executer MANUELLEMENT dans le Supabase SQL editor. 100% idempotent.
-- =============================================

BEGIN;

UPDATE public.agents
SET model = 'gpt-5.4'
WHERE model IS DISTINCT FROM 'gpt-5.4';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================
-- VERIFICATION (hors transaction) — doit montrer une seule ligne gpt-5.4 = 24
-- =============================================
SELECT model, count(*) AS nb
FROM public.agents
GROUP BY model
ORDER BY nb DESC;
