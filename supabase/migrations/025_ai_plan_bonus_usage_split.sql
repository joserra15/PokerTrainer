-- Separar uso IA del plan vs bono: las consultas gastadas del bono no consumen
-- cupo mensual del plan (p. ej. Gratis→Study con bono previo).

create or replace function public.pt_ai_usage_month_count(p_user_id text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.pt_ai_usage
  where user_id = p_user_id
    and (timezone('Europe/Madrid', created_at))::date >= public.pt_month_start_utc();
$$;

create or replace function public.pt_ai_bonus_usage_month_count(p_user_id text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(-delta), 0)::int
  from public.pt_ai_bonus_ledger
  where user_id = p_user_id
    and reason = 'ai_usage'
    and delta < 0
    and (timezone('Europe/Madrid', created_at))::date >= public.pt_month_start_utc();
$$;

create or replace function public.pt_ai_plan_used_month_count(p_user_id text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    public.pt_ai_usage_month_count(p_user_id) - public.pt_ai_bonus_usage_month_count(p_user_id)
  )::int;
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
  plan_used int;
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
  plan_used := public.pt_ai_plan_used_month_count(p_user_id);
  bonus := public.pt_bonus_effective_balance(prof);

  if plan_lim is null then
    return json_build_object('ok', true, 'source', 'plan', 'unlimited', true, 'used', used);
  end if;

  if plan_used < plan_lim then
    return json_build_object(
      'ok', true, 'source', 'plan', 'used', used, 'plan_used', plan_used,
      'limit', plan_lim, 'bonus_balance', bonus
    );
  end if;

  if bonus > 0 then
    return json_build_object(
      'ok', true, 'source', 'bonus', 'used', used, 'plan_used', plan_used,
      'limit', plan_lim, 'bonus_balance', bonus
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
  ai_plan_used int := 0;
  ai_bonus_used int := 0;
  paid_active boolean;
  effective_plan text;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  paid_active := prof.plan in ('pro', 'premium')
    and (
      prof.subscription_status in ('active', 'trialing')
      or (
        prof.subscription_status in ('canceling', 'past_due', 'canceled')
        and prof.subscription_period_end is not null
        and prof.subscription_period_end > timezone('utc', now())
      )
    );

  effective_plan := prof.plan;
  if prof.plan in ('pro', 'premium') and not paid_active and not prof.is_admin then
    effective_plan := 'free';
  end if;

  lim := public.pt_plan_limits(effective_plan);

  if p_force_admin and prof.is_admin then
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
  ai_bonus_used := public.pt_ai_bonus_usage_month_count(p_user_id);
  ai_plan_used := public.pt_ai_plan_used_month_count(p_user_id);

  return json_build_object(
    'plan', case when prof.is_admin then prof.plan else effective_plan end,
    'plan_label', case (case when prof.is_admin then prof.plan else effective_plan end)
      when 'pro' then 'Study'
      when 'premium' then 'Coach'
      else 'Gratis'
    end,
    'is_admin', prof.is_admin,
    'subscription_status', prof.subscription_status,
    'subscription_period_end', prof.subscription_period_end,
    'billing_interval', prof.billing_interval,
    'subscription_cancel_at_period_end', prof.subscription_cancel_at_period_end,
    'paid_active', paid_active,
    'limits', lim,
    'usage', json_build_object(
      'trainer_hands_today', trainer_today,
      'import_sessions_month', imports_month,
      'ai_reports_month', ai_month,
      'ai_plan_used_month', ai_plan_used,
      'ai_bonus_used_month', ai_bonus_used
    ),
    'bonus', public.pt_bonus_json(prof),
    'stripe_customer_id', prof.stripe_customer_id
  );
end;
$$;
