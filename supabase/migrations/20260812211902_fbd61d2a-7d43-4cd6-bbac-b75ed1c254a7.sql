CREATE TABLE public.guest_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  guest_name text NOT NULL,
  old_family_id uuid,
  new_family_id uuid,
  old_host_id uuid,
  new_host_id uuid,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guest_link_audit TO authenticated;
GRANT ALL ON public.guest_link_audit TO service_role;
ALTER TABLE public.guest_link_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest link audit readable by event managers"
ON public.guest_link_audit FOR SELECT TO authenticated
USING (public.has_event_role(event_id, ARRAY['owner'::public.event_member_role, 'organizer'::public.event_member_role]));

CREATE INDEX guest_link_audit_event_changed_idx
ON public.guest_link_audit(event_id, changed_at DESC);

CREATE TABLE public.guest_link_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  links jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, snapshot_date)
);
GRANT SELECT ON public.guest_link_snapshots TO authenticated;
GRANT ALL ON public.guest_link_snapshots TO service_role;
ALTER TABLE public.guest_link_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest link snapshots readable by event managers"
ON public.guest_link_snapshots FOR SELECT TO authenticated
USING (public.has_event_role(event_id, ARRAY['owner'::public.event_member_role, 'organizer'::public.event_member_role]));

CREATE OR REPLACE FUNCTION public.capture_guest_link_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.family_id IS NOT DISTINCT FROM OLD.family_id
     AND NEW.host_id IS NOT DISTINCT FROM OLD.host_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.guest_link_snapshots(event_id, snapshot_date, links)
  SELECT OLD.event_id, CURRENT_DATE,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'guest_id', g.id,
          'legacy_id', g.legacy_id,
          'name', g.name,
          'family_id', g.family_id,
          'host_id', g.host_id,
          'is_primary', g.is_primary
        ) ORDER BY g.legacy_id
      ),
      '[]'::jsonb
    )
  FROM public.guests g
  WHERE g.event_id = OLD.event_id
  ON CONFLICT (event_id, snapshot_date) DO NOTHING;

  INSERT INTO public.guest_link_audit(
    event_id, guest_id, guest_name,
    old_family_id, new_family_id, old_host_id, new_host_id, changed_by
  ) VALUES (
    OLD.event_id, OLD.id, OLD.name,
    OLD.family_id, NEW.family_id, OLD.host_id, NEW.host_id, auth.uid()
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_guest_link_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_guest_link_change() TO service_role;

CREATE TRIGGER capture_guest_link_change
BEFORE UPDATE OF family_id, host_id ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.capture_guest_link_change();

CREATE OR REPLACE FUNCTION public.block_mass_guest_link_clear()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleared_count integer;
BEGIN
  SELECT count(*)
  INTO cleared_count
  FROM old_rows o
  JOIN new_rows n ON n.id = o.id
  WHERE (o.family_id IS NOT NULL AND n.family_id IS NULL)
     OR (o.host_id IS NOT NULL AND n.host_id IS NULL);

  IF cleared_count > 1 THEN
    RAISE EXCEPTION 'Operação bloqueada: tentativa de remover vínculos de família/responsável de % convidados', cleared_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.block_mass_guest_link_clear() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_mass_guest_link_clear() TO service_role;

CREATE TRIGGER block_mass_guest_link_clear
AFTER UPDATE ON public.guests
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.block_mass_guest_link_clear();