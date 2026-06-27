-- Admin: fin de plan editable, renovación, inferir periodo desde último pago.

create or replace function public.pt_extend_period_from_payment(
  p_user_id text,
  p_paid_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz := coalesce(p_paid_at, timezone('utc', now()));
  new_end timestamptz;
begin
  if p_user_id is null or p_user_id = '' then
    return;
  end if;

  select case
    when billing_interval = 'year' then ts + interval '1 year'
    else ts + interval '1 month'
  end
  into new_end
  from public.pt_user_profiles
  where user_id = p_user_id;

  if new_end is null then
    return;
  end if;

  update public.pt_user_profiles
  set
    subscription_period_end = greatest(coalesce(subscription_period_end, 'epoch'::timestamptz), new_end),
    subscription_status = case
      when plan in ('pro', 'premium') then coalesce(nullif(subscription_status, 'none'), 'active')
      else subscription_status
    end
  where user_id = p_user_id
    and plan in ('pro', 'premium');
end;
$$;

revoke all on function public.pt_extend_period_from_payment(text, timestamptz) from public;

create or replace function public.pt_admin_update_user(
  p_user_id text,
  p_plan text default null,
  p_is_admin boolean default null,
  p_subscription_period_end timestamptz default null
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
      when p_plan in ('pro', 'premium') and p_subscription_period_end is not null
        and p_subscription_period_end > timezone('utc', now()) then 'active'
      when p_plan in ('pro', 'premium') then 'active'
      when p_subscription_period_end is not null
        and p_subscription_period_end <= timezone('utc', now())
        and plan = 'free' then 'expired'
      else subscription_status
    end,
    subscription_period_end = case
      when p_subscription_period_end is not null then p_subscription_period_end
      when p_plan = 'free' then null
      else subscription_period_end
    end,
    billing_interval = case
      when p_plan = 'free' then null
      else billing_interval
    end,
    stripe_subscription_id = case
      when p_plan = 'free' then null
      else stripe_subscription_id
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
  billing_interval text,
  stripe_subscription_id text,
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
  p_stripe_customer_id text default null,
  p_paid_at timestamptz default now(),
  p_user_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz := coalesce(p_paid_at, timezone('utc', now()));
  uid text := p_user_id;
begin
  if p_stripe_customer_id is not null and p_stripe_customer_id <> '' then
    update public.pt_user_profiles
    set
      stripe_last_payment_at = greatest(coalesce(stripe_last_payment_at, 'epoch'::timestamptz), ts),
      stripe_customer_id = coalesce(stripe_customer_id, p_stripe_customer_id)
    where stripe_customer_id = p_stripe_customer_id;

    if uid is null then
      select user_id into uid
      from public.pt_user_profiles
      where stripe_customer_id = p_stripe_customer_id
      limit 1;
    end if;
  end if;

  if p_user_id is not null and p_user_id <> '' then
    update public.pt_user_profiles
    set stripe_last_payment_at = greatest(coalesce(stripe_last_payment_at, 'epoch'::timestamptz), ts)
    where user_id = p_user_id;
    uid := p_user_id;
  end if;

  if uid is not null and uid <> '' then
    perform public.pt_extend_period_from_payment(uid, ts);
  end if;
end;
$$;

revoke all on function public.pt_record_stripe_payment(text, timestamptz, text) from public;
