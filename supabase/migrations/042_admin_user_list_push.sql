-- Lista admin: quién tiene push activo (al menos un dispositivo enabled).

drop function if exists public.pt_admin_user_list();

create function public.pt_admin_user_list()
returns table (
  user_id text,
  email text,
  name text,
  plan text,
  is_admin boolean,
  is_founder boolean,
  is_founder_study boolean,
  is_founder_coach boolean,
  founder_requested_at timestamptz,
  founder_study_requested_at timestamptz,
  founder_coach_requested_at timestamptz,
  ai_daily_limit int,
  last_seen_at timestamptz,
  created_at timestamptz,
  ai_today bigint,
  ai_limit int,
  ai_bonus_balance int,
  ai_bonus_effective int,
  ai_bonus_expires_at timestamptz,
  ai_total_available int,
  subscription_status text,
  subscription_period_end timestamptz,
  billing_interval text,
  stripe_subscription_id text,
  subscription_cancel_at_period_end boolean,
  stripe_last_payment_at timestamptz,
  push_enabled boolean,
  push_devices int
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
    (coalesce(p.is_founder_study, false) or coalesce(p.is_founder_coach, false) or coalesce(p.is_founder, false)) as is_founder,
    coalesce(p.is_founder_study, false) as is_founder_study,
    coalesce(p.is_founder_coach, false) as is_founder_coach,
    p.founder_requested_at,
    p.founder_study_requested_at,
    p.founder_coach_requested_at,
    p.ai_daily_limit,
    p.last_seen_at,
    p.created_at,
    coalesce(u.cnt, 0)::bigint as ai_today,
    public.pt_ai_plan_limit(p) as ai_limit,
    coalesce(p.ai_bonus_balance, 0) as ai_bonus_balance,
    public.pt_bonus_effective_balance(p) as ai_bonus_effective,
    p.ai_bonus_expires_at,
    case
      when p.is_admin then null
      when public.pt_ai_plan_limit(p) is null then null
      else greatest(0, public.pt_ai_plan_limit(p) - coalesce(u.cnt, 0)::int)
        + public.pt_bonus_effective_balance(p)
    end as ai_total_available,
    p.subscription_status,
    p.subscription_period_end,
    p.billing_interval,
    p.stripe_subscription_id,
    p.subscription_cancel_at_period_end,
    p.stripe_last_payment_at,
    (coalesce(psub.devices, 0) > 0) as push_enabled,
    coalesce(psub.devices, 0) as push_devices
  from public.pt_user_profiles p
  left join lateral (
    select count(*)::bigint as cnt
    from public.pt_ai_usage a
    where a.user_id = p.user_id
      and a.created_at >= public.pt_month_start_utc()
  ) u on true
  left join lateral (
    select count(*)::int as devices
    from public.pt_push_subscriptions s
    where s.user_id = p.user_id
      and s.enabled = true
  ) psub on true
  order by p.last_seen_at desc nulls last, p.created_at desc;
end;
$$;

revoke all on function public.pt_admin_user_list() from public;
grant execute on function public.pt_admin_user_list() to authenticated;
