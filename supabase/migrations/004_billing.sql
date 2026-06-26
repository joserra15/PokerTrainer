-- Epic 3: Monetización — Stripe, uso freemium y entitlements.
-- Ejecutar tras 003_admin_panel.sql

-- Campos de facturación en perfil
alter table public.pt_user_profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists subscription_period_end timestamptz,
  add column if not exists billing_interval text,
  add column if not exists ai_monthly_limit int;

create index if not exists pt_user_profiles_stripe_customer_idx
  on public.pt_user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Uso diario (manos entrenador)
create table if not exists public.pt_usage_daily (
  user_id text not null,
  usage_date date not null default (timezone('utc', now())::date),
  trainer_hands int not null default 0,
  primary key (user_id, usage_date)
);

-- Uso mensual (imports, IA)
create table if not exists public.pt_usage_monthly (
  user_id text not null,
  usage_month date not null,
  import_sessions int not null default 0,
  ai_reports int not null default 0,
  primary key (user_id, usage_month)
);

alter table public.pt_usage_daily enable row level security;
alter table public.pt_usage_monthly enable row level security;

drop policy if exists "usage_daily_select_own" on public.pt_usage_daily;
create policy "usage_daily_select_own"
on public.pt_usage_daily for select to authenticated
using (user_id = auth.uid()::text);

drop policy if exists "usage_monthly_select_own" on public.pt_usage_monthly;
create policy "usage_monthly_select_own"
on public.pt_usage_monthly for select to authenticated
using (user_id = auth.uid()::text);

-- Límites por plan (null = ilimitado)
create or replace function public.pt_plan_limits(p_plan text)
returns json
language sql
immutable
as $$
  select case p_plan
    when 'pro' then json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', 0,
      'history_days', null
    )
    when 'premium' then json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', 30,
      'history_days', null
    )
    else json_build_object(
      'trainer_hands_per_day', 15,
      'import_sessions_per_month', 1,
      'max_hands_per_import', 200,
      'ai_reports_per_month', 0,
      'history_days', 30
    )
  end;
$$;

create or replace function public.pt_month_start_utc()
returns date
language sql
stable
as $$
  select date_trunc('month', timezone('utc', now()))::date;
$$;

create or replace function public.pt_today_utc()
returns date
language sql
stable
as $$
  select timezone('utc', now())::date;
$$;

-- Entitlements + uso actual del usuario autenticado
create or replace function public.pt_get_entitlements()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prof public.pt_user_profiles;
  lim json;
  trainer_today int := 0;
  imports_month int := 0;
  ai_month int := 0;
  paid_active boolean;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid;
  if not found then
    insert into public.pt_user_profiles (user_id, email, name, last_seen_at)
    values (uid, '', '', now())
    returning * into prof;
  end if;

  lim := public.pt_plan_limits(prof.plan);

  if prof.is_admin then
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
  where user_id = uid and usage_date = public.pt_today_utc();

  select coalesce(import_sessions, 0), coalesce(ai_reports, 0)
  into imports_month, ai_month
  from public.pt_usage_monthly
  where user_id = uid and usage_month = public.pt_month_start_utc();

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

revoke all on function public.pt_get_entitlements() from public;
grant execute on function public.pt_get_entitlements() to authenticated;

-- Registrar mano de entrenador (incrementa contador diario)
create or replace function public.pt_record_trainer_hand()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  ent json;
  lim json;
  max_hands int;
  used int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  ent := public.pt_get_entitlements();
  if (ent->>'is_admin')::boolean then
    return json_build_object('ok', true, 'unlimited', true);
  end if;

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
  values (uid, public.pt_today_utc(), 1)
  on conflict (user_id, usage_date) do update
  set trainer_hands = pt_usage_daily.trainer_hands + 1;

  return json_build_object('ok', true, 'used', used + 1, 'limit', max_hands);
end;
$$;

revoke all on function public.pt_record_trainer_hand() from public;
grant execute on function public.pt_record_trainer_hand() to authenticated;

-- Registrar sesión importada
create or replace function public.pt_record_import_session(p_hand_count int default 0)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  ent json;
  lim json;
  max_imports int;
  max_hands int;
  used int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  ent := public.pt_get_entitlements();
  if (ent->>'is_admin')::boolean then
    return json_build_object('ok', true, 'unlimited', true);
  end if;

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
  values (uid, public.pt_month_start_utc(), 1)
  on conflict (user_id, usage_month) do update
  set import_sessions = pt_usage_monthly.import_sessions + 1;

  return json_build_object('ok', true, 'used', used + 1, 'limit', max_imports);
end;
$$;

revoke all on function public.pt_record_import_session(int) from public;
grant execute on function public.pt_record_import_session(int) to authenticated;

-- Actualizar plan tras webhook Stripe (solo service role)
create or replace function public.pt_apply_subscription(
  p_user_id text,
  p_plan text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_period_end timestamptz,
  p_interval text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan not in ('free', 'pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  insert into public.pt_user_profiles (
    user_id, email, name, plan,
    stripe_customer_id, stripe_subscription_id,
    subscription_status, subscription_period_end, billing_interval,
    last_seen_at
  )
  values (
    p_user_id, '', '', p_plan,
    p_stripe_customer_id, p_stripe_subscription_id,
    coalesce(p_status, 'none'), p_period_end, p_interval,
    now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, pt_user_profiles.stripe_customer_id),
    stripe_subscription_id = excluded.stripe_subscription_id,
    subscription_status = excluded.subscription_status,
    subscription_period_end = excluded.subscription_period_end,
    billing_interval = excluded.billing_interval;
end;
$$;

revoke all on function public.pt_apply_subscription(text, text, text, text, text, timestamptz, text) from public;

-- Guardar stripe_customer_id sin cambiar plan
create or replace function public.pt_set_stripe_customer(p_user_id text, p_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pt_user_profiles
  set stripe_customer_id = p_customer_id
  where user_id = p_user_id;
end;
$$;

revoke all on function public.pt_set_stripe_customer(text, text) from public;

-- Actualizar admin list: límites IA mensuales (DROP necesario: cambia columnas de retorno)
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
  subscription_period_end timestamptz
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
    coalesce(
      p.ai_monthly_limit,
      p.ai_daily_limit,
      case p.plan
        when 'premium' then 30
        when 'pro' then 0
        else 0
      end
    ) as ai_limit,
    p.subscription_status,
    p.subscription_period_end
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
