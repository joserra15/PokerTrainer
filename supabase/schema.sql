-- Ejecutar en Supabase > SQL Editor (una vez).
-- Un registro por usuario con payload JSON: stats, history, errors, sessions.

create table if not exists public.pt_user_state (
  user_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pt_user_state enable row level security;

drop policy if exists "anon_read_write_dev" on public.pt_user_state;
create policy "anon_read_write_dev"
on public.pt_user_state
for all
to anon
using (true)
with check (true);
