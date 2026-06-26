-- Panel de administración: perfiles, uso IA, admins.
-- Ejecutar en Supabase SQL Editor tras 002_production_rls.sql

-- Perfil extendido (plan, admin, actividad)
create table if not exists public.pt_user_profiles (
  user_id text primary key,
  email text not null default '',
  name text not null default '',
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  is_admin boolean not null default false,
  ai_daily_limit int,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pt_user_profiles_email_idx on public.pt_user_profiles (lower(email));
create index if not exists pt_user_profiles_last_seen_idx on public.pt_user_profiles (last_seen_at desc);

-- Registro de peticiones IA (persistente; edge function inserta con service role)
create table if not exists public.pt_ai_usage (
  id bigserial primary key,
  user_id text not null,
  mode text not null default 'report',
  created_at timestamptz not null default now()
);

create index if not exists pt_ai_usage_user_day_idx
  on public.pt_ai_usage (user_id, created_at desc);

-- ¿El usuario actual es admin?
create or replace function public.is_pt_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.pt_user_profiles where user_id = auth.uid()::text),
    false
  );
$$;

revoke all on function public.is_pt_admin() from public;
grant execute on function public.is_pt_admin() to authenticated;

-- Heartbeat al login / actividad: actualiza perfil sin tocar is_admin ni plan
create or replace function public.pt_touch_profile(p_email text, p_name text default '')
returns public.pt_user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pt_user_profiles;
  uid text := auth.uid()::text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.pt_user_profiles (user_id, email, name, last_seen_at)
  values (uid, coalesce(p_email, ''), coalesce(p_name, ''), now())
  on conflict (user_id) do update set
    email = excluded.email,
    name = case when excluded.name <> '' then excluded.name else pt_user_profiles.name end,
    last_seen_at = now();

  -- Admin inicial por email (bootstrap)
  update public.pt_user_profiles
  set is_admin = true
  where user_id = uid and lower(email) = lower('joserra15@gmail.com');

  select * into r from public.pt_user_profiles where user_id = uid;
  return r;
end;
$$;

revoke all on function public.pt_touch_profile(text, text) from public;
grant execute on function public.pt_touch_profile(text, text) to authenticated;

-- Lista de usuarios para el panel admin (con uso IA del día)
create or replace function public.pt_admin_user_list()
returns table (
  user_id text,
  email text,
  name text,
  plan text,
  is_admin boolean,
  ai_daily_limit int,
  last_seen_at timestamptz,
  created_at timestamptz,
  ai_today bigint,
  ai_limit int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.user_id,
    p.email,
    p.name,
    p.plan,
    p.is_admin,
    p.ai_daily_limit,
    p.last_seen_at,
    p.created_at,
    coalesce(u.cnt, 0)::bigint as ai_today,
    coalesce(
      p.ai_daily_limit,
      case p.plan
        when 'pro' then 500
        when 'premium' then 2000
        else 120
      end
    ) as ai_limit
  from public.pt_user_profiles p
  left join lateral (
    select count(*)::bigint as cnt
    from public.pt_ai_usage a
    where a.user_id = p.user_id
      and a.created_at >= date_trunc('day', now() at time zone 'utc')
  ) u on true
  order by p.last_seen_at desc nulls last, p.created_at desc;
end;
$$;

revoke all on function public.pt_admin_user_list() from public;
grant execute on function public.pt_admin_user_list() to authenticated;

-- Resumen global para el panel
create or replace function public.pt_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select json_build_object(
    'total_users', (select count(*) from public.pt_user_profiles),
    'active_today', (
      select count(*) from public.pt_user_profiles
      where last_seen_at >= date_trunc('day', now() at time zone 'utc')
    ),
    'online_now', (
      select count(*) from public.pt_user_profiles
      where last_seen_at >= now() - interval '15 minutes'
    ),
    'ai_requests_today', (
      select count(*) from public.pt_ai_usage
      where created_at >= date_trunc('day', now() at time zone 'utc')
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.pt_admin_stats() from public;
grant execute on function public.pt_admin_stats() to authenticated;

-- RLS pt_user_profiles
alter table public.pt_user_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.pt_user_profiles;
drop policy if exists "profiles_select_admin" on public.pt_user_profiles;
drop policy if exists "profiles_update_admin" on public.pt_user_profiles;

create policy "profiles_select_own"
on public.pt_user_profiles for select to authenticated
using (user_id = auth.uid()::text);

create policy "profiles_select_admin"
on public.pt_user_profiles for select to authenticated
using (public.is_pt_admin());

create policy "profiles_update_admin"
on public.pt_user_profiles for update to authenticated
using (public.is_pt_admin())
with check (public.is_pt_admin());

-- RLS pt_ai_usage (lectura propia + admin; escritura solo service role)
alter table public.pt_ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.pt_ai_usage;
drop policy if exists "ai_usage_select_admin" on public.pt_ai_usage;

create policy "ai_usage_select_own"
on public.pt_ai_usage for select to authenticated
using (user_id = auth.uid()::text);

create policy "ai_usage_select_admin"
on public.pt_ai_usage for select to authenticated
using (public.is_pt_admin());

-- Admin inicial si ya existe en auth.users
insert into public.pt_user_profiles (user_id, email, name, plan, is_admin, last_seen_at)
select
  id::text,
  coalesce(email, ''),
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email, ''),
  'free',
  true,
  now()
from auth.users
where lower(email) = lower('joserra15@gmail.com')
on conflict (user_id) do update set
  is_admin = true,
  email = excluded.email;
