ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS party_role text NOT NULL DEFAULT 'Organizador',
  ADD COLUMN IF NOT EXISTS can_finance boolean NOT NULL DEFAULT true;

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));