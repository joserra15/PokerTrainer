-- Ejecutar en Supabase > SQL Editor (una vez).
-- Un registro por usuario con payload JSON: stats, history, errors, sessions.
-- EPIC 2: requiere Supabase Auth; ver supabase/migrations/002_production_rls.sql

create table if not exists public.pt_user_state (
  user_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pt_user_state enable row level security;

drop policy if exists "anon_read_write_dev" on public.pt_user_state;
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

-- Ver supabase/migrations/003_admin_panel.sql para perfiles, uso IA y panel admin.
