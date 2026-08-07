-- Remove anonymous access from all party tables

-- app_state
DROP POLICY IF EXISTS "app_state insertable by anyone" ON public.app_state;
DROP POLICY IF EXISTS "app_state readable by anyone" ON public.app_state;
DROP POLICY IF EXISTS "app_state updatable by anyone" ON public.app_state;
REVOKE ALL ON public.app_state FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;
CREATE POLICY "app_state readable by authenticated" ON public.app_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_state insertable by authenticated" ON public.app_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "app_state updatable by authenticated" ON public.app_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- guests
DROP POLICY IF EXISTS "guests open delete" ON public.guests;
DROP POLICY IF EXISTS "guests open insert" ON public.guests;
DROP POLICY IF EXISTS "guests open read" ON public.guests;
DROP POLICY IF EXISTS "guests open update" ON public.guests;
REVOKE ALL ON public.guests FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT ALL ON public.guests TO service_role;
CREATE POLICY "guests managed by authenticated" ON public.guests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- families
DROP POLICY IF EXISTS "families open delete" ON public.families;
DROP POLICY IF EXISTS "families open insert" ON public.families;
DROP POLICY IF EXISTS "families open read" ON public.families;
DROP POLICY IF EXISTS "families open update" ON public.families;
REVOKE ALL ON public.families FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
CREATE POLICY "families managed by authenticated" ON public.families FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- hosts
DROP POLICY IF EXISTS "hosts open delete" ON public.hosts;
DROP POLICY IF EXISTS "hosts open insert" ON public.hosts;
DROP POLICY IF EXISTS "hosts open read" ON public.hosts;
DROP POLICY IF EXISTS "hosts open update" ON public.hosts;
REVOKE ALL ON public.hosts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hosts TO authenticated;
GRANT ALL ON public.hosts TO service_role;
CREATE POLICY "hosts managed by authenticated" ON public.hosts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tasks
DROP POLICY IF EXISTS "tasks open delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks open insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks open read" ON public.tasks;
DROP POLICY IF EXISTS "tasks open update" ON public.tasks;
REVOKE ALL ON public.tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
CREATE POLICY "tasks managed by authenticated" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- suppliers
DROP POLICY IF EXISTS "suppliers open delete" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers open insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers open read" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers open update" ON public.suppliers;
REVOKE ALL ON public.suppliers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
CREATE POLICY "suppliers managed by authenticated" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- expenses
DROP POLICY IF EXISTS "expenses open delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses open insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses open read" ON public.expenses;
DROP POLICY IF EXISTS "expenses open update" ON public.expenses;
REVOKE ALL ON public.expenses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
CREATE POLICY "expenses managed by authenticated" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- profiles: only own row
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE ALL ON public.profiles FROM anon;