-- Límites por tiempo local (Europe/Madrid) y endurecimiento del fin de suscripción.
--
-- 1) El cupo diario del entrenador y el cupo mensual de imports se calculan y
--    reinician según la fecha LOCAL de España (00:00 Europe/Madrid), no en UTC.
--    Así el contador está fresco desde el primer minuto del día/mes local.
-- 2) Cuando una suscripción llega a su fin (periodo pagado agotado), el usuario
--    vuelve a los límites del plan Gratis aunque el webhook de Stripe aún no
--    haya sincronizado el cambio de plan en la base de datos.

-- Fecha local (Europe/Madrid) para el cupo diario.
create or replace function public.pt_today_utc()
returns date
language sql
stable
as $$
  select (timezone('Europe/Madrid', now()))::date;
$$;

-- Primer día del mes local (Europe/Madrid) para el cupo mensual.
create or replace function public.pt_month_start_utc()
returns date
language sql
stable
as $$
  select date_trunc('month', timezone('Europe/Madrid', now()))::date;
$$;

-- Entitlements: usa el plan efectivo (Gratis si la suscripción ya expiró).
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
  effective_plan text;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  -- Suscripción con acceso vigente:
  --  · active/trialing renuevan solas → acceso garantizado
  --  · canceling/past_due/canceled → acceso solo hasta que termine el periodo pagado
  paid_active := prof.plan in ('pro', 'premium')
    and (
      prof.subscription_status in ('active', 'trialing')
      or (
        prof.subscription_status in ('canceling', 'past_due', 'canceled')
        and prof.subscription_period_end is not null
        and prof.subscription_period_end > timezone('utc', now())
      )
    );

  -- Plan efectivo: si la suscripción ya no está vigente, límites de Gratis.
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
      'ai_reports_month', ai_month
    ),
    'bonus', public.pt_bonus_json(prof),
    'stripe_customer_id', prof.stripe_customer_id
  );
end;
$$;
