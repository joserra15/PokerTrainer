-- Panel admin: cupos IA con bonos y detalle de usuario.

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
  ai_bonus_balance int,
  ai_bonus_effective int,
  ai_bonus_expires_at timestamptz,
  ai_total_available int,
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

-- Detalle completo de un usuario (admin)
create or replace function public.pt_admin_user_detail(p_user_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  plan_lim int;
  used int;
  bonus_eff int;
  plan_left int;
  ledger json;
  usage_rows json;
  threads json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  plan_lim := public.pt_ai_plan_limit(prof);
  used := public.pt_ai_usage_month_count(p_user_id);
  bonus_eff := public.pt_bonus_effective_balance(prof);
  plan_left := case
    when prof.is_admin or plan_lim is null then null
    else greatest(0, plan_lim - used)
  end;

  select coalesce(json_agg(row_to_json(l) order by l.created_at desc), '[]'::json)
  into ledger
  from (
    select id, delta, balance_after, reason, stripe_session_id, pack_code, created_at
    from public.pt_ai_bonus_ledger
    where user_id = p_user_id
    order by created_at desc
    limit 100
  ) l;

  select coalesce(json_agg(row_to_json(r) order by r.created_at desc), '[]'::json)
  into usage_rows
  from (
    select id, mode, created_at
    from public.pt_ai_usage
    where user_id = p_user_id
      and created_at >= public.pt_month_start_utc()
    order by created_at desc
    limit 100
  ) r;

  select coalesce(json_agg(row_to_json(t) order by t.last_message_at desc), '[]'::json)
  into threads
  from (
    select
      id,
      subject,
      status,
      admin_unread_count,
      user_unread_count,
      last_message_at,
      created_at
    from public.pt_contact_threads
    where user_id = p_user_id
    order by last_message_at desc nulls last
    limit 50
  ) t;

  return json_build_object(
    'profile', json_build_object(
      'user_id', prof.user_id,
      'email', prof.email,
      'name', prof.name,
      'plan', prof.plan,
      'is_admin', prof.is_admin,
      'subscription_status', prof.subscription_status,
      'subscription_period_end', prof.subscription_period_end,
      'billing_interval', prof.billing_interval,
      'subscription_cancel_at_period_end', prof.subscription_cancel_at_period_end,
      'stripe_customer_id', prof.stripe_customer_id,
      'stripe_subscription_id', prof.stripe_subscription_id,
      'stripe_last_payment_at', prof.stripe_last_payment_at,
      'created_at', prof.created_at,
      'last_seen_at', prof.last_seen_at
    ),
    'quotas', json_build_object(
      'plan_limit', plan_lim,
      'used_month', used,
      'plan_remaining', plan_left,
      'bonus_balance', bonus_eff,
      'bonus_raw_balance', coalesce(prof.ai_bonus_balance, 0),
      'bonus_expires_at', prof.ai_bonus_expires_at,
      'total_remaining', case
        when prof.is_admin then null
        when plan_lim is null then null
        else coalesce(plan_left, 0) + bonus_eff
      end,
      'is_admin', prof.is_admin,
      'unlimited', prof.is_admin or plan_lim is null
    ),
    'bonus_ledger', ledger,
    'ai_usage_month', usage_rows,
    'contact_threads', threads
  );
end;
$$;

revoke all on function public.pt_admin_user_detail(text) from public;
grant execute on function public.pt_admin_user_detail(text) to authenticated;

-- Bootstrap admin por email (coherente con pt_touch_profile)
create or replace function public.pt_profile_is_admin(p_prof public.pt_user_profiles)
returns boolean
language sql
stable
as $$
  select coalesce(p_prof.is_admin, false)
    or lower(coalesce(p_prof.email, '')) = lower('info@pokerforgeai.com');
$$;

create or replace function public.pt_ai_plan_limit(p_prof public.pt_user_profiles)
returns int
language plpgsql
stable
as $$
declare
  lim json;
begin
  if public.pt_profile_is_admin(p_prof) then
    return null;
  end if;
  if p_prof.ai_monthly_limit is not null and p_prof.ai_monthly_limit > 0 then
    return p_prof.ai_monthly_limit;
  end if;
  lim := public.pt_plan_limits(p_prof.plan);
  return (lim->>'ai_reports_per_month')::int;
end;
$$;

create or replace function public.pt_check_ai_access(p_user_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  plan_lim int;
  used int;
  bonus int;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if public.pt_profile_is_admin(prof) then
    return json_build_object('ok', true, 'source', 'admin', 'unlimited', true);
  end if;

  plan_lim := public.pt_ai_plan_limit(prof);
  used := public.pt_ai_usage_month_count(p_user_id);
  bonus := public.pt_bonus_effective_balance(prof);

  if plan_lim is null then
    return json_build_object('ok', true, 'source', 'plan', 'unlimited', true, 'used', used);
  end if;

  if used < plan_lim then
    return json_build_object(
      'ok', true, 'source', 'plan', 'used', used, 'limit', plan_lim,
      'bonus_balance', bonus
    );
  end if;

  if bonus > 0 then
    return json_build_object(
      'ok', true, 'source', 'bonus', 'used', used, 'limit', plan_lim,
      'bonus_balance', bonus
    );
  end if;

  if plan_lim <= 0 then
    return json_build_object('ok', false, 'error', 'ai_plan', 'used', used, 'limit', plan_lim);
  end if;

  return json_build_object('ok', false, 'error', 'ai_limit', 'used', used, 'limit', plan_lim);
end;
$$;

create or replace function public.pt_build_entitlements_json(
  p_user_id text,
  p_force_admin boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  lim json;
  trainer_today int := 0;
  imports_month int := 0;
  ai_month int := 0;
  paid_active boolean;
  admin_flag boolean;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  admin_flag := public.pt_profile_is_admin(prof);
  lim := public.pt_plan_limits(prof.plan);

  if p_force_admin and admin_flag then
    lim := json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', null,
      'history_days', null
    );
  elsif prof.ai_monthly_limit is not null and prof.ai_monthly_limit > 0 then
    lim := lim || json_build_object('ai_reports_per_month', prof.ai_monthly_limit);
  end if;

  select coalesce(trainer_hands, 0) into trainer_today
  from public.pt_usage_daily
  where user_id = p_user_id and usage_date = public.pt_today_utc();

  select coalesce(import_sessions, 0) into imports_month
  from public.pt_usage_monthly
  where user_id = p_user_id and usage_month = public.pt_month_start_utc();

  ai_month := public.pt_ai_usage_month_count(p_user_id);

  paid_active := prof.plan in ('pro', 'premium')
    and (
      prof.subscription_status in ('active', 'trialing', 'canceling', 'past_due')
      or (
        prof.subscription_period_end is not null
        and prof.subscription_period_end > timezone('utc', now())
      )
    );

  return json_build_object(
    'plan', prof.plan,
    'plan_label', case prof.plan
      when 'pro' then 'Study'
      when 'premium' then 'Coach'
      else 'Gratis'
    end,
    'is_admin', admin_flag,
    'subscription_status', prof.subscription_status,
    'subscription_period_end', prof.subscription_period_end,
    'billing_interval', prof.billing_interval,
    'subscription_cancel_at_period_end', prof.subscription_cancel_at_period_end,
    'paid_active', paid_active,
    'limits', lim,
    'usage', json_build_object(
      'trainer_hands_today', trainer_today,
      'import_sessions_month', imports_month,
      'ai_reports_month', ai_month
    ),
    'bonus', public.pt_bonus_json(prof),
    'stripe_customer_id', prof.stripe_customer_id
  );
end;
$$;
