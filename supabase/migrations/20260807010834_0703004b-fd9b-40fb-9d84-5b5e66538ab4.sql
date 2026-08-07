ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS invite_virtual_at text;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS invite_physical boolean NOT NULL DEFAULT false;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS invite_physical_at text;