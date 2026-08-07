ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS invite_virtual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_virtual_at text,
  ADD COLUMN IF NOT EXISTS rsvp_deadline text;