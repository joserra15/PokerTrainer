-- Expose stripe_last_payment_at so the client can detect admin/promo grants
-- (paid plan, possible stale stripe_subscription_id, but never paid in Stripe).

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
    'is_founder', coalesce(prof.is_founder_study, false) or coalesce(prof.is_founder_coach, false) or coalesce(prof.is_founder, false),
    'is_founder_study', coalesce(prof.is_founder_study, false),
    'is_founder_coach', coalesce(prof.is_founder_coach, false),
    'founder_requested_at', prof.founder_requested_at,
    'founder_study_requested_at', prof.founder_study_requested_at,
    'founder_coach_requested_at', prof.founder_coach_requested_at,
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
    'stripe_customer_id', prof.stripe_customer_id,
    'stripe_subscription_id', prof.stripe_subscription_id,
    'stripe_last_payment_at', prof.stripe_last_payment_at
  );
end;
$$;
