-- EPIC 2: RLS de producción para pt_user_state.
-- Ejecutar en Supabase SQL Editor tras habilitar Google en Authentication.
-- Requiere que la app use Supabase Auth (JWT authenticated).

alter table public.pt_user_state enable row level security;

drop policy if exists "anon_read_write_dev" on public.pt_user_state;
drop policy if exists "select_own" on public.pt_user_state;
drop policy if exists "insert_own" on public.pt_user_state;
drop policy if exists "update_own" on public.pt_user_state;
drop policy if exists "delete_own" on public.pt_user_state;

-- Lectura / escritura: solo la fila del JWT (auth.uid()).
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
