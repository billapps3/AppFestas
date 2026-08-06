-- Responsáveis
CREATE TABLE public.hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hosts TO anon, authenticated;
GRANT ALL ON public.hosts TO service_role;
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosts open read" ON public.hosts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "hosts open insert" ON public.hosts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "hosts open update" ON public.hosts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hosts open delete" ON public.hosts FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_hosts_updated_at BEFORE UPDATE ON public.hosts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Famílias / grupos
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO anon, authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "families open read" ON public.families FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "families open insert" ON public.families FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "families open update" ON public.families FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "families open delete" ON public.families FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Convidados
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  name text NOT NULL,
  phone text,
  age integer,
  is_child boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Aguardando',
  invite_virtual boolean NOT NULL DEFAULT false,
  invite_physical boolean NOT NULL DEFAULT false,
  invite_personal boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  host_id uuid REFERENCES public.hosts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guests_family_id_idx ON public.guests(family_id);
CREATE INDEX guests_host_id_idx ON public.guests(host_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO anon, authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guests open read" ON public.guests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "guests open insert" ON public.guests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "guests open update" ON public.guests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "guests open delete" ON public.guests FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tarefas
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  name text NOT NULL,
  area text,
  owner text,
  due text,
  status text NOT NULL DEFAULT 'Aguardando',
  priority text NOT NULL DEFAULT 'Média',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks open read" ON public.tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tasks open insert" ON public.tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "tasks open update" ON public.tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tasks open delete" ON public.tasks FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Carga inicial a partir do backup recuperado
INSERT INTO public.hosts (name) VALUES ('William'), ('Késya'), ('Mirella')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.families (name)
VALUES ('Mirella Colégio'), ('Mirella CNA'), ('Mirella Vôlei'), ('Mirella Igreja')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.families (name)
SELECT DISTINCT trim(g->>'family')
FROM public.app_state, jsonb_array_elements(data->'guests') g
WHERE id = 'mirella15-backup-v2' AND coalesce(trim(g->>'family'), '') <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.hosts (name)
SELECT DISTINCT trim(g->>'host')
FROM public.app_state, jsonb_array_elements(data->'guests') g
WHERE id = 'mirella15-backup-v2' AND coalesce(trim(g->>'host'), '') <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.guests (
  legacy_id, name, phone, age, is_child, status,
  invite_virtual, invite_physical, invite_personal, is_primary, family_id, host_id
)
SELECT
  (g->>'id')::int,
  g->>'name',
  nullif(g->>'phone', ''),
  nullif(g->>'age', '')::int,
  coalesce((g->>'child')::boolean, false),
  coalesce(nullif(g->>'status', ''), 'Aguardando'),
  coalesce((g->>'virtual')::boolean, false),
  coalesce((g->>'physical')::boolean, false),
  coalesce((g->>'personal')::boolean, false),
  coalesce(trim(g->>'family'), '') = g->>'name',
  f.id,
  h.id
FROM public.app_state s
CROSS JOIN LATERAL jsonb_array_elements(s.data->'guests') g
LEFT JOIN public.families f ON f.name = trim(g->>'family')
LEFT JOIN public.hosts h ON h.name = trim(g->>'host')
WHERE s.id = 'mirella15-backup-v2'
ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO public.tasks (legacy_id, name, area, owner, due, status, priority)
SELECT
  (t->>'id')::int,
  t->>'name',
  t->>'area',
  t->>'owner',
  t->>'due',
  coalesce(nullif(t->>'status', ''), 'Aguardando'),
  coalesce(nullif(t->>'priority', ''), 'Média')
FROM public.app_state s
CROSS JOIN LATERAL jsonb_array_elements(s.data->'tasks') t
WHERE s.id = 'mirella15-backup-v2'
ON CONFLICT (legacy_id) DO NOTHING;