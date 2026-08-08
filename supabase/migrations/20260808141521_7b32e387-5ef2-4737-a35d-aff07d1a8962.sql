REVOKE ALL ON FUNCTION public.event_role_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_event_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_event_role(uuid, public.event_member_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_event_with(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_rsvp_guest_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_role_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_event_role(uuid, public.event_member_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_event_with(uuid) TO authenticated;