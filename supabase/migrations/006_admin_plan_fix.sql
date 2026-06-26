-- Admin: actualizar plan/admin vía RPC (evita fallos silenciosos de RLS en UPDATE directo)
create or replace function public.pt_admin_update_user(
  p_user_id text,
  p_plan text default null,
  p_is_admin boolean default null
)
returns public.pt_user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pt_user_profiles;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  if p_plan is not null and p_plan not in ('free', 'pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  update public.pt_user_profiles
  set
    plan = coalesce(p_plan, plan),
    is_admin = coalesce(p_is_admin, is_admin),
    subscription_status = case
      when p_plan = 'free' then 'none'
      when p_plan in ('pro', 'premium') then 'active'
      else subscription_status
    end
  where user_id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;

  select * into r from public.pt_user_profiles where user_id = p_user_id;
  return r;
end;
$$;

revoke all on function public.pt_admin_update_user(text, text, boolean) from public;
grant execute on function public.pt_admin_update_user(text, text, boolean) to authenticated;

-- Límite IA mensual coherente con pt_plan_limits (sin mezclar ai_daily_limit legacy)
drop function if exists public.pt_admin_user_list();

create function public.pt_admin_user_list()
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
  ai_limit int,
  subscription_status text,
  subscription_period_end timestamptz
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
    case
      when p.is_admin then null
      when p.ai_monthly_limit is not null then p.ai_monthly_limit
      else (public.pt_plan_limits(p.plan)->>'ai_reports_per_month')::int
    end as ai_limit,
    p.subscription_status,
    p.subscription_period_end
  from public.pt_user_profiles p
  left join lateral (
    select count(*)::bigint as cnt
    from public.pt_ai_usage a
    where a.user_id = p.user_id
      and a.created_at >= public.pt_month_start_utc()
  ) u on true
  order by p.last_seen_at desc nulls last, p.created_at desc;
end;
$$;

revoke all on function public.pt_admin_user_list() from public;
grant execute on function public.pt_admin_user_list() to authenticated;
