-- Manos de «Análisis de manos»: payload fuera de localStorage / pt_user_state.
-- Patrón espejo de pt_import_sessions (cloud-first + índice ligero en dispositivo).

create table if not exists public.pt_analysis_hands (
  user_id text not null,
  hand_id text not null,
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, hand_id)
);

create index if not exists pt_analysis_hands_user_active_idx
  on public.pt_analysis_hands (user_id, updated_at desc)
  where deleted_at is null;

alter table public.pt_analysis_hands enable row level security;

drop policy if exists "analysis_hands_select_own" on public.pt_analysis_hands;
drop policy if exists "analysis_hands_insert_own" on public.pt_analysis_hands;
drop policy if exists "analysis_hands_update_own" on public.pt_analysis_hands;
drop policy if exists "analysis_hands_delete_own" on public.pt_analysis_hands;

create policy "analysis_hands_select_own"
on public.pt_analysis_hands for select to authenticated
using (user_id = auth.uid()::text);

create policy "analysis_hands_insert_own"
on public.pt_analysis_hands for insert to authenticated
with check (user_id = auth.uid()::text);

create policy "analysis_hands_update_own"
on public.pt_analysis_hands for update to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

create policy "analysis_hands_delete_own"
on public.pt_analysis_hands for delete to authenticated
using (user_id = auth.uid()::text);
