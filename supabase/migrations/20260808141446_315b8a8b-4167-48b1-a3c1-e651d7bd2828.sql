-- ========== 1. BACKUP ==========
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM PUBLIC, anon, authenticated;
CREATE TABLE backup.guests_20260808 AS SELECT * FROM public.guests;
CREATE TABLE backup.families_20260808 AS SELECT * FROM public.families;
CREATE TABLE backup.hosts_20260808 AS SELECT * FROM public.hosts;
CREATE TABLE backup.tasks_20260808 AS SELECT * FROM public.tasks;
CREATE TABLE backup.suppliers_20260808 AS SELECT * FROM public.suppliers;
CREATE TABLE backup.expenses_20260808 AS SELECT * FROM public.expenses;
CREATE TABLE backup.installments_20260808 AS SELECT * FROM public.installments;
CREATE TABLE backup.payers_20260808 AS SELECT * FROM public.payers;
CREATE TABLE backup.profiles_20260808 AS SELECT * FROM public.profiles;
CREATE TABLE backup.user_roles_20260808 AS SELECT * FROM public.user_roles;

-- ========== 2. EVENTS ==========
CREATE TYPE public.event_member_role AS ENUM ('owner','organizer','planner','rsvp','celebrant','viewer');

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  event_date date,
  type text NOT NULL DEFAULT 'aniversario',
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

CREATE TABLE public.event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.event_member_role NOT NULL DEFAULT 'organizer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX event_members_user_idx ON public.event_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_members TO authenticated;
GRANT ALL ON public.event_members TO service_role;

CREATE TABLE public.event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.event_member_role NOT NULL DEFAULT 'organizer',
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX event_invites_pending_idx ON public.event_invites(event_id, lower(email)) WHERE accepted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_invites TO authenticated;
GRANT ALL ON public.event_invites TO service_role;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_members_updated_at BEFORE UPDATE ON public.event_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_invites_updated_at BEFORE UPDATE ON public.event_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 3. HELPER FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.event_role_of(_event uuid, _user uuid DEFAULT auth.uid())
RETURNS public.event_member_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.event_members WHERE event_id = _event AND user_id = _user;
$$;

CREATE OR REPLACE FUNCTION public.is_event_member(_event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_members WHERE event_id = _event AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_event_role(_event uuid, _roles public.event_member_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = _event AND user_id = auth.uid() AND role = ANY(_roles)
  );
$$;

-- ========== 4. EVENT / MEMBER / INVITE POLICIES ==========
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable by members" ON public.events FOR SELECT TO authenticated USING (public.is_event_member(id));
CREATE POLICY "events created by owner" ON public.events FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "events updated by managers" ON public.events FOR UPDATE TO authenticated
  USING (public.has_event_role(id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "events deleted by owner" ON public.events FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members readable by members" ON public.event_members FOR SELECT TO authenticated USING (public.is_event_member(event_id));
CREATE POLICY "members inserted by managers" ON public.event_members FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "members updated by managers" ON public.event_members FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]) AND user_id <> auth.uid())
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]) AND user_id <> auth.uid());
CREATE POLICY "members deleted by managers" ON public.event_members FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]) AND user_id <> auth.uid());

ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites managed by managers" ON public.event_invites FOR ALL TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

-- ========== 5. SEED THE MIRELLA EVENT ==========
INSERT INTO public.events (id, owner_id, name, event_date, type, plan, status)
VALUES ('11111111-1111-4111-8111-111111111111', '46c3dd86-b7ef-4d42-866a-49cad1a71b8f', '15 anos da Mirella', '2026-10-02', 'quinze_anos', 'pro', 'active');

INSERT INTO public.event_members (event_id, user_id, role) VALUES
  ('11111111-1111-4111-8111-111111111111', '46c3dd86-b7ef-4d42-866a-49cad1a71b8f', 'owner'),
  ('11111111-1111-4111-8111-111111111111', '3062cfec-a5ce-457b-a962-227e601b9c4e', 'organizer'),
  ('11111111-1111-4111-8111-111111111111', '48fe8332-e3a8-43a1-92dc-1d59579fc568', 'celebrant');

-- ========== 6. event_id ON DATA TABLES (additive, backfilled) ==========
ALTER TABLE public.guests       ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.families     ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.hosts        ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.tasks        ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers    ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.expenses     ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.installments ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.payers       ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

UPDATE public.guests       SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.families     SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.hosts        SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.tasks        SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.suppliers    SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.expenses     SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.installments SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;
UPDATE public.payers       SET event_id = '11111111-1111-4111-8111-111111111111' WHERE event_id IS NULL;

DO $$
DECLARE missing int;
BEGIN
  SELECT (SELECT count(*) FROM public.guests WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.families WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.hosts WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.tasks WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.suppliers WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.expenses WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.installments WHERE event_id IS NULL)
       + (SELECT count(*) FROM public.payers WHERE event_id IS NULL) INTO missing;
  IF missing > 0 THEN RAISE EXCEPTION 'backfill incompleto: % linhas sem evento', missing; END IF;
  IF (SELECT count(*) FROM public.guests) <> (SELECT count(*) FROM backup.guests_20260808) THEN
    RAISE EXCEPTION 'contagem de convidados divergente';
  END IF;
END $$;

ALTER TABLE public.guests       ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.families     ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.hosts        ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.tasks        ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.suppliers    ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.expenses     ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.installments ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.payers       ALTER COLUMN event_id SET NOT NULL;

ALTER TABLE public.guests       ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.families     ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.hosts        ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.tasks        ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.suppliers    ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.expenses     ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.installments ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';
ALTER TABLE public.payers       ALTER COLUMN event_id SET DEFAULT '11111111-1111-4111-8111-111111111111';

CREATE INDEX guests_event_idx ON public.guests(event_id);
CREATE INDEX families_event_idx ON public.families(event_id);
CREATE INDEX hosts_event_idx ON public.hosts(event_id);
CREATE INDEX tasks_event_idx ON public.tasks(event_id);
CREATE INDEX suppliers_event_idx ON public.suppliers(event_id);
CREATE INDEX expenses_event_idx ON public.expenses(event_id);
CREATE INDEX installments_event_idx ON public.installments(event_id);
CREATE INDEX payers_event_idx ON public.payers(event_id);

-- ========== 7. REPLACE OPEN POLICIES ==========
DROP POLICY IF EXISTS "guests managed by authenticated" ON public.guests;
DROP POLICY IF EXISTS "families managed by authenticated" ON public.families;
DROP POLICY IF EXISTS "hosts managed by authenticated" ON public.hosts;
DROP POLICY IF EXISTS "tasks managed by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "suppliers managed by authenticated" ON public.suppliers;
DROP POLICY IF EXISTS "expenses managed by authenticated" ON public.expenses;
DROP POLICY IF EXISTS "installments managed by authenticated" ON public.installments;
DROP POLICY IF EXISTS "payers managed by authenticated" ON public.payers;

-- guests: every member reads; rsvp may only change confirmation status (enforced by trigger)
CREATE POLICY "guests readable by members" ON public.guests FOR SELECT TO authenticated USING (public.is_event_member(event_id));
CREATE POLICY "guests inserted by guest managers" ON public.guests FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "guests updated by guest editors" ON public.guests FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner','rsvp']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner','rsvp']::public.event_member_role[]));
CREATE POLICY "guests deleted by guest managers" ON public.guests FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));

CREATE OR REPLACE FUNCTION public.enforce_rsvp_guest_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.event_role_of(OLD.event_id) = 'rsvp' THEN
    IF NEW.event_id IS DISTINCT FROM OLD.event_id
       OR NEW.name IS DISTINCT FROM OLD.name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.age IS DISTINCT FROM OLD.age
       OR NEW.is_child IS DISTINCT FROM OLD.is_child
       OR NEW.family_id IS DISTINCT FROM OLD.family_id
       OR NEW.host_id IS DISTINCT FROM OLD.host_id
       OR NEW.is_primary IS DISTINCT FROM OLD.is_primary
       OR NEW.invite_physical IS DISTINCT FROM OLD.invite_physical
       OR NEW.invite_personal IS DISTINCT FROM OLD.invite_personal THEN
      RAISE EXCEPTION 'Perfil RSVP só pode alterar a confirmação do convidado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guests_rsvp_scope BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.enforce_rsvp_guest_scope();

-- families / hosts: readable by members, edited by guest managers
CREATE POLICY "families readable by members" ON public.families FOR SELECT TO authenticated USING (public.is_event_member(event_id));
CREATE POLICY "families written by guest managers" ON public.families FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "families updated by guest managers" ON public.families FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "families deleted by guest managers" ON public.families FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE POLICY "hosts readable by members" ON public.hosts FOR SELECT TO authenticated USING (public.is_event_member(event_id));
CREATE POLICY "hosts written by guest managers" ON public.hosts FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "hosts updated by guest managers" ON public.hosts FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "hosts deleted by guest managers" ON public.hosts FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

-- tasks: everyone but rsvp reads; celebrant may update, not insert/delete
CREATE POLICY "tasks readable by members" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner','celebrant','viewer']::public.event_member_role[]));
CREATE POLICY "tasks inserted by task managers" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "tasks updated by task editors" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner','celebrant']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer','planner','celebrant']::public.event_member_role[]));
CREATE POLICY "tasks deleted by task managers" ON public.tasks FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));

-- finance: suppliers / expenses / installments / payers
CREATE POLICY "suppliers readable by finance" ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "suppliers inserted by finance managers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "suppliers updated by finance managers" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "suppliers deleted by finance managers" ON public.suppliers FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE POLICY "expenses readable by finance" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "expenses inserted by finance managers" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "expenses updated by finance managers" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "expenses deleted by finance managers" ON public.expenses FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE POLICY "installments readable by finance" ON public.installments FOR SELECT TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "installments inserted by finance managers" ON public.installments FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "installments updated by finance managers" ON public.installments FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "installments deleted by finance managers" ON public.installments FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

CREATE POLICY "payers readable by finance" ON public.payers FOR SELECT TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer','planner']::public.event_member_role[]));
CREATE POLICY "payers written by finance managers" ON public.payers FOR INSERT TO authenticated
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "payers updated by finance managers" ON public.payers FOR UPDATE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]))
  WITH CHECK (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));
CREATE POLICY "payers deleted by finance managers" ON public.payers FOR DELETE TO authenticated
  USING (public.has_event_role(event_id, ARRAY['owner','organizer']::public.event_member_role[]));

-- profiles: members of a shared event can see each other (name/role display)
CREATE OR REPLACE FUNCTION public.shares_event_with(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members a
    JOIN public.event_members b ON a.event_id = b.event_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user
  );
$$;
CREATE POLICY "profiles readable by event peers" ON public.profiles FOR SELECT TO authenticated USING (public.shares_event_with(id));