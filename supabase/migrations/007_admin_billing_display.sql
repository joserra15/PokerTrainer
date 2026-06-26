-- Último pago Stripe + fixes admin (límite IA por plan, reset legacy ai_monthly_limit)

alter table public.pt_user_profiles
  add column if not exists stripe_last_payment_at timestamptz;

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
    ai_monthly_limit = case when p_plan is not null then null else ai_monthly_limit end,
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
    case
      when p.is_admin then null
      else (public.pt_plan_limits(p.plan)->>'ai_reports_per_month')::int
    end as ai_limit,
    p.subscription_status,
    p.subscription_period_end,
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

create or replace function public.pt_record_stripe_payment(
  p_stripe_customer_id text,
  p_paid_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stripe_customer_id is null or p_stripe_customer_id = '' then
    return;
  end if;
  update public.pt_user_profiles
  set stripe_last_payment_at = coalesce(p_paid_at, now())
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

revoke all on function public.pt_record_stripe_payment(text, timestamptz) from public;
