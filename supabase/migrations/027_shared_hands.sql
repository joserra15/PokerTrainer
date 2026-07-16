-- Manos compartidas (HTML estático temporal, caduca a las 2 semanas).

create table if not exists public.pt_shared_hands (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null check (source in ('trainer', 'analysis', 'session')),
  title text not null default '',
  html text not null,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null
);

create index if not exists pt_shared_hands_expires_idx
  on public.pt_shared_hands (expires_at);

create index if not exists pt_shared_hands_user_idx
  on public.pt_shared_hands (user_id, created_at desc);

alter table public.pt_shared_hands enable row level security;

-- Solo service_role / edge functions (sin políticas para anon/authenticated).
-- El acceso público se hace vía Edge Function con service role.

create or replace function public.pt_purge_expired_shared_hands()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.pt_shared_hands
  where expires_at < timezone('utc', now());

  get diagnostics n = row_count;

  return json_build_object(
    'ok', true,
    'deleted', n,
    'run_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.pt_purge_expired_shared_hands() from public;
grant execute on function public.pt_purge_expired_shared_hands() to service_role;

-- Cron diario 00:15 UTC (si pg_cron está disponible)
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception when others then
  raise notice 'pg_cron no disponible: %', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'pt-purge-shared-hands';
exception when others then
  null;
end $$;

do $cron$
begin
  perform cron.schedule(
    'pt-purge-shared-hands',
    '15 0 * * *',
    $job$select public.pt_purge_expired_shared_hands();$job$
  );
exception when others then
  raise notice 'No se pudo programar cron pt-purge-shared-hands: %', sqlerrm;
end $cron$;
