-- Usuario demo, expiración diaria de suscripciones y entitlements demo (admin).

-- ID fijo del usuario demo (no auth.users; solo perfil + uso)
-- Cambia su plan desde Admin para probar límites en Modo demo.

insert into public.pt_user_profiles (
  user_id, email, name, plan, is_admin, subscription_status, last_seen_at
)
values (
  'pt_demo_user', 'demo@pokertrainer.local', 'Usuario demo', 'free', false, 'none', now()
)
on conflict (user_id) do update set
  email = excluded.email,
  name = excluded.name,
  is_admin = false;

-- Entitlements JSON para un user_id (sin bypass admin salvo p_force_admin)
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
    and prof.subscription_status in ('active', 'trialing');

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

revoke all on function public.pt_build_entitlements_json(text, boolean) from public;

-- Refactor pt_get_entitlements para usar helper
create or replace function public.pt_get_entitlements()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.pt_user_profiles where user_id = uid) then
    insert into public.pt_user_profiles (user_id, email, name, last_seen_at)
    values (uid, '', '', now());
  end if;

  return public.pt_build_entitlements_json(uid, true);
end;
$$;

revoke all on function public.pt_get_entitlements() from public;
grant execute on function public.pt_get_entitlements() to authenticated;

-- Entitlements del usuario demo (solo admin autenticado)
create or replace function public.pt_get_demo_entitlements()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  return public.pt_build_entitlements_json('pt_demo_user', false);
end;
$$;

revoke all on function public.pt_get_demo_entitlements() from public;
grant execute on function public.pt_get_demo_entitlements() to authenticated;

-- Registrar uso en demo user (solo admin)
create or replace function public.pt_demo_record_trainer_hand()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  ent json;
  lim json;
  max_hands int;
  used int;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  ent := public.pt_build_entitlements_json('pt_demo_user', false);
  lim := ent->'limits';
  if lim->>'trainer_hands_per_day' is null then
    return json_build_object('ok', true, 'unlimited', true);
  end if;

  max_hands := (lim->>'trainer_hands_per_day')::int;
  used := coalesce((ent->'usage'->>'trainer_hands_today')::int, 0);

  if used >= max_hands then
    return json_build_object('ok', false, 'error', 'trainer_limit', 'used', used, 'limit', max_hands);
  end if;

  insert into public.pt_usage_daily (user_id, usage_date, trainer_hands)
  values ('pt_demo_user', public.pt_today_utc(), 1)
  on conflict (user_id, usage_date) do update
  set trainer_hands = pt_usage_daily.trainer_hands + 1;

  return json_build_object('ok', true, 'used', used + 1, 'limit', max_hands);
end;
$$;

revoke all on function public.pt_demo_record_trainer_hand() from public;
grant execute on function public.pt_demo_record_trainer_hand() to authenticated;

create or replace function public.pt_demo_record_import_session(p_hand_count int default 0)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  ent json;
  lim json;
  max_imports int;
  max_hands int;
  used int;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  ent := public.pt_build_entitlements_json('pt_demo_user', false);
  lim := ent->'limits';
  if lim->>'import_sessions_per_month' is null then
    return json_build_object('ok', true, 'unlimited', true);
  end if;

  max_imports := (lim->>'import_sessions_per_month')::int;
  max_hands := (lim->>'max_hands_per_import')::int;
  used := coalesce((ent->'usage'->>'import_sessions_month')::int, 0);

  if used >= max_imports then
    return json_build_object('ok', false, 'error', 'import_limit', 'used', used, 'limit', max_imports);
  end if;

  if max_hands is not null and p_hand_count > max_hands then
    return json_build_object('ok', false, 'error', 'import_hands_limit', 'hands', p_hand_count, 'limit', max_hands);
  end if;

  insert into public.pt_usage_monthly (user_id, usage_month, import_sessions)
  values ('pt_demo_user', public.pt_month_start_utc(), 1)
  on conflict (user_id, usage_month) do update
  set import_sessions = pt_usage_monthly.import_sessions + 1;

  return json_build_object('ok', true, 'used', used + 1, 'limit', max_imports);
end;
$$;

revoke all on function public.pt_demo_record_import_session(int) from public;
grant execute on function public.pt_demo_record_import_session(int) to authenticated;

-- Bajar a gratis suscripciones caducadas (red de seguridad si falla webhook Stripe)
create or replace function public.pt_expire_subscriptions()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.pt_user_profiles
  set
    plan = 'free',
    subscription_status = 'expired',
    billing_interval = null
  where
    user_id <> 'pt_demo_user'
    and is_admin = false
    and plan in ('pro', 'premium')
    and subscription_period_end is not null
    and subscription_period_end < timezone('utc', now())
    and subscription_status in ('active', 'trialing', 'past_due');

  get diagnostics n = row_count;

  return json_build_object('ok', true, 'expired', n, 'run_at', timezone('utc', now()));
end;
$$;

revoke all on function public.pt_expire_subscriptions() from public;

-- Cron diario 00:05 UTC (si pg_cron está disponible)
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception when others then
  raise notice 'pg_cron no disponible: %', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'pt-expire-subscriptions';
exception when others then
  null;
end $$;

do $cron$
begin
  perform cron.schedule(
    'pt-expire-subscriptions',
    '5 0 * * *',
    $job$select public.pt_expire_subscriptions();$job$
  );
exception when others then
  raise notice 'No se pudo programar cron pt-expire-subscriptions: %', sqlerrm;
end $cron$;
