-- =============================================
-- Reset progressions after slug rename
-- =============================================
-- Module slugs changed from module-0X-... to mX-...
-- Old progression rows reference stale slugs and are
-- all test data — safe to truncate.
-- =============================================

TRUNCATE public.progressions;
