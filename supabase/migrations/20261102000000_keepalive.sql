-- Lightweight function pinged by the scheduled Netlify function (netlify/functions/keepalive.mts)
-- so the Free-plan project registers daily activity and is not paused for inactivity.
CREATE OR REPLACE FUNCTION public.keepalive()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = ''
AS $$ SELECT now() $$;

REVOKE ALL ON FUNCTION public.keepalive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keepalive() TO anon, authenticated;
