-- Estado real de renovación Stripe (auto vs cancelada al fin de periodo).

alter table public.pt_user_profiles
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

drop function if exists public.pt_apply_subscription(text, text, text, text, text, timestamptz, text);

create or replace function public.pt_apply_subscription(
  p_user_id text,
  p_plan text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_period_end timestamptz,
  p_interval text,
  p_cancel_at_period_end boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := coalesce(p_status, 'none');
  v_cancel boolean := coalesce(p_cancel_at_period_end, false);
begin
  if p_plan not in ('free', 'pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  if v_status in ('canceled', 'unpaid', 'incomplete_expired') then
    v_cancel := true;
  end if;

  insert into public.pt_user_profiles (
    user_id, email, name, plan,
    stripe_customer_id, stripe_subscription_id,
    subscription_status, subscription_period_end, billing_interval,
    subscription_cancel_at_period_end,
    last_seen_at
  )
  values (
    p_user_id, '', '', p_plan,
    p_stripe_customer_id, p_stripe_subscription_id,
    v_status, p_period_end, p_interval,
    v_cancel,
    now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, pt_user_profiles.stripe_customer_id),
    stripe_subscription_id = excluded.stripe_subscription_id,
    subscription_status = excluded.subscription_status,
    subscription_period_end = excluded.subscription_period_end,
    billing_interval = excluded.billing_interval,
    subscription_cancel_at_period_end = excluded.subscription_cancel_at_period_end;
end;
$$;

revoke all on function public.pt_apply_subscription(text, text, text, text, text, timestamptz, text, boolean) from public;

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
  subscription_period_end timestamptz,
  billing_interval text,
  stripe_subscription_id text,
  subscription_cancel_at_period_end boolean,
  stripe_last_payment_at timestamptz
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
    (public.pt_plan_limits(p.plan)->>'ai_reports_per_month')::int as ai_limit,
    p.subscription_status,
    p.subscription_period_end,
    p.billing_interval,
    p.stripe_subscription_id,
    p.subscription_cancel_at_period_end,
    p.stripe_last_payment_at
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
