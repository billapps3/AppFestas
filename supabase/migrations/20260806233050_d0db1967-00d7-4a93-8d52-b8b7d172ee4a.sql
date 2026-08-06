CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  contact text,
  status text NOT NULL DEFAULT 'Orçamento',
  value numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  due text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers open read" ON public.suppliers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "suppliers open insert" ON public.suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "suppliers open update" ON public.suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "suppliers open delete" ON public.suppliers FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  planned numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  due text,
  status text NOT NULL DEFAULT 'Previsto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses open read" ON public.expenses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "expenses open insert" ON public.expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "expenses open update" ON public.expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses open delete" ON public.expenses FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();