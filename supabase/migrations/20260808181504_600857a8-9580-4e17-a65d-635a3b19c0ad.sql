-- push_subscriptions: escopo por evento
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- push_messages: escopo, tipo e público
ALTER TABLE public.push_messages ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.push_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'manual';
ALTER TABLE public.push_messages ADD COLUMN IF NOT EXISTS audience_roles public.event_member_role[] NOT NULL DEFAULT '{}';
ALTER TABLE public.push_messages ADD COLUMN IF NOT EXISTS audience_user_ids uuid[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE public.push_messages ADD CONSTRAINT push_messages_kind_check
    CHECK (kind IN ('manual','task_done','rsvp','pending_report'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- backfill: evento único existente
UPDATE public.push_subscriptions s
SET event_id = (SELECT e.id FROM public.events e ORDER BY e.created_at LIMIT 1)
WHERE s.event_id IS NULL;

UPDATE public.push_messages m
SET event_id = (SELECT e.id FROM public.events e ORDER BY e.created_at LIMIT 1)
WHERE m.event_id IS NULL;

-- leitura de mensagens restrita a membros do evento
DROP POLICY IF EXISTS "push_messages_select" ON public.push_messages;
DROP POLICY IF EXISTS "Authenticated can read push messages" ON public.push_messages;
CREATE POLICY "push_messages_select_members" ON public.push_messages
  FOR SELECT TO authenticated
  USING (event_id IS NOT NULL AND public.is_event_member(event_id));

-- configurações dos avisos automáticos
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('task_done','rsvp','pending_report')),
  enabled boolean NOT NULL DEFAULT true,
  audience_roles public.event_member_role[] NOT NULL DEFAULT '{owner,organizer}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_select_members" ON public.notification_settings
  FOR SELECT TO authenticated
  USING (public.is_event_member(event_id));

CREATE POLICY "notification_settings_insert_admins" ON public.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE POLICY "notification_settings_update_admins" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE POLICY "notification_settings_delete_admins" ON public.notification_settings
  FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- padrões para eventos existentes
INSERT INTO public.notification_settings (event_id, kind, enabled, audience_roles)
SELECT e.id, v.kind, true, v.roles
FROM public.events e
CROSS JOIN (VALUES
  ('task_done', ARRAY['owner','organizer','planner']::public.event_member_role[]),
  ('rsvp', ARRAY['owner','organizer','rsvp']::public.event_member_role[]),
  ('pending_report', ARRAY['owner','organizer','planner']::public.event_member_role[])
) AS v(kind, roles)
ON CONFLICT (event_id, kind) DO NOTHING;