-- Fix lint: RLS no debe usar auth.jwt() -> user_metadata (editable por el cliente).
-- El acceso legado por Google sub se migraba en cliente a auth.uid(); las políticas
-- quedan solo con auth.uid()::text.

-- pt_user_state
drop policy if exists "select_own" on public.pt_user_state;
drop policy if exists "insert_own" on public.pt_user_state;
drop policy if exists "update_own" on public.pt_user_state;
drop policy if exists "delete_own" on public.pt_user_state;

create policy "select_own"
on public.pt_user_state
for select
to authenticated
using (user_id = auth.uid()::text);

create policy "insert_own"
on public.pt_user_state
for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy "update_own"
on public.pt_user_state
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

create policy "delete_own"
on public.pt_user_state
for delete
to authenticated
using (user_id = auth.uid()::text);

-- pt_import_sessions (mismo antipatrón)
drop policy if exists "import_sessions_select_own" on public.pt_import_sessions;
drop policy if exists "import_sessions_insert_own" on public.pt_import_sessions;
drop policy if exists "import_sessions_update_own" on public.pt_import_sessions;
drop policy if exists "import_sessions_delete_own" on public.pt_import_sessions;

create policy "import_sessions_select_own"
on public.pt_import_sessions
for select
to authenticated
using (user_id = auth.uid()::text);

create policy "import_sessions_insert_own"
on public.pt_import_sessions
for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy "import_sessions_update_own"
on public.pt_import_sessions
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

create policy "import_sessions_delete_own"
on public.pt_import_sessions
for delete
to authenticated
using (user_id = auth.uid()::text);
