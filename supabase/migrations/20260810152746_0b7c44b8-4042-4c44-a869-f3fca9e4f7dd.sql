-- 1. app_state: legacy backup table, no app code reads it. Lock to service_role only.
DROP POLICY IF EXISTS "app_state readable by authenticated" ON public.app_state;
DROP POLICY IF EXISTS "app_state insertable by authenticated" ON public.app_state;
DROP POLICY IF EXISTS "app_state updatable by authenticated" ON public.app_state;
REVOKE ALL ON public.app_state FROM authenticated, anon;
GRANT ALL ON public.app_state TO service_role;

-- 2. push_messages: drop the permissive USING(true) select policy
DROP POLICY IF EXISTS "push messages readable by authenticated" ON public.push_messages;

-- 3. Trigger-only SECURITY DEFINER functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_owner_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_rsvp_guest_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;