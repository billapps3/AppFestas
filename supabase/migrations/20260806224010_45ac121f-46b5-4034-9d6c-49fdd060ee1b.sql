ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_legacy_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_legacy_id_key ON public.tasks (legacy_id);