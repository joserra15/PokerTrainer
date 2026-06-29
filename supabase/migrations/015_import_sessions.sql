-- Sesiones importadas: una fila por sesión (payload grande fuera de pt_user_state).

create table if not exists public.pt_import_sessions (
  user_id text not null,
  session_id text not null,
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index if not exists pt_import_sessions_user_active_idx
  on public.pt_import_sessions (user_id, updated_at desc)
  where deleted_at is null;

alter table public.pt_import_sessions enable row level security;

drop policy if exists "import_sessions_select_own" on public.pt_import_sessions;
drop policy if exists "import_sessions_insert_own" on public.pt_import_sessions;
drop policy if exists "import_sessions_update_own" on public.pt_import_sessions;
drop policy if exists "import_sessions_delete_own" on public.pt_import_sessions;

create policy "import_sessions_select_own"
on public.pt_import_sessions for select to authenticated
using (
  user_id = auth.uid()::text
  or user_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sub', '')
);

create policy "import_sessions_insert_own"
on public.pt_import_sessions for insert to authenticated
with check (user_id = auth.uid()::text);

create policy "import_sessions_update_own"
on public.pt_import_sessions for update to authenticated
using (
  user_id = auth.uid()::text
  or user_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sub', '')
)
with check (user_id = auth.uid()::text);

create policy "import_sessions_delete_own"
on public.pt_import_sessions for delete to authenticated
using (
  user_id = auth.uid()::text
  or user_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sub', '')
);
