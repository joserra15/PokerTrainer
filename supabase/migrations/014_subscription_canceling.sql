-- Suscripción cancelada: estado 'canceling', acceso hasta fin de periodo.

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
  v_plan text := p_plan;
  v_period_end timestamptz := p_period_end;
begin
  if p_plan not in ('free', 'pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  if v_status in ('canceled', 'unpaid', 'incomplete_expired') then
    v_cancel := true;
  end if;

  if v_cancel and v_status = 'active' then
    v_status := 'canceling';
  end if;

  if v_status in ('canceled', 'unpaid', 'incomplete_expired')
    and (v_period_end is null or v_period_end <= timezone('utc', now())) then
    v_plan := 'free';
  end if;

  insert into public.pt_user_profiles (
    user_id, email, name, plan,
    stripe_customer_id, stripe_subscription_id,
    subscription_status, subscription_period_end, billing_interval,
    subscription_cancel_at_period_end,
    last_seen_at
  )
  values (
    p_user_id, '', '', v_plan,
    p_stripe_customer_id, p_stripe_subscription_id,
    v_status, v_period_end, p_interval,
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
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  lim := public.pt_plan_limits(prof.plan);

  if p_force_admin and prof.is_admin then
    lim := json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', null,
      'history_days', null
    );
  end if;

  select coalesce(trainer_hands, 0) into trainer_today
  from public.pt_usage_daily
  where user_id = p_user_id and usage_date = public.pt_today_utc();

  select coalesce(import_sessions, 0), coalesce(ai_reports, 0)
  into imports_month, ai_month
  from public.pt_usage_monthly
  where user_id = p_user_id and usage_month = public.pt_month_start_utc();

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
      'ai_reports_month', ai_month
    ),
    'stripe_customer_id', prof.stripe_customer_id
  );
end;
$$;
