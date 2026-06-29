-- Bono de consultas IA: cupos Study 5 / Coach 35, saldo comprado (12 meses).

alter table public.pt_user_profiles
  add column if not exists ai_bonus_balance int not null default 0,
  add column if not exists ai_bonus_expires_at timestamptz;

create table if not exists public.pt_ai_bonus_ledger (
  id bigserial primary key,
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  delta int not null,
  balance_after int not null,
  reason text not null,
  stripe_session_id text,
  pack_code text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pt_ai_bonus_ledger_user_idx
  on public.pt_ai_bonus_ledger (user_id, created_at desc);

alter table public.pt_ai_bonus_ledger enable row level security;

drop policy if exists "ai_bonus_ledger_select_own" on public.pt_ai_bonus_ledger;
create policy "ai_bonus_ledger_select_own"
on public.pt_ai_bonus_ledger for select to authenticated
using (user_id = auth.uid()::text);

-- Cupos incluidos actualizados
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
      'ai_reports_per_month', 5,
      'history_days', null
    )
    when 'premium' then json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', 35,
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

create or replace function public.pt_ai_plan_limit(p_prof public.pt_user_profiles)
returns int
language plpgsql
stable
as $$
declare
  lim json;
  custom int;
begin
  if p_prof.is_admin then
    return null;
  end if;
  if p_prof.ai_monthly_limit is not null and p_prof.ai_monthly_limit > 0 then
    return p_prof.ai_monthly_limit;
  end if;
  lim := public.pt_plan_limits(p_prof.plan);
  return (lim->>'ai_reports_per_month')::int;
end;
$$;

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
    and created_at >= date_trunc('month', timezone('utc', now()));
$$;

create or replace function public.pt_bonus_effective_balance(p_prof public.pt_user_profiles)
returns int
language plpgsql
stable
as $$
begin
  if p_prof.ai_bonus_balance is null or p_prof.ai_bonus_balance <= 0 then
    return 0;
  end if;
  if p_prof.ai_bonus_expires_at is not null
     and p_prof.ai_bonus_expires_at <= timezone('utc', now()) then
    return 0;
  end if;
  return p_prof.ai_bonus_balance;
end;
$$;

create or replace function public.pt_bonus_json(p_prof public.pt_user_profiles)
returns json
language sql
stable
as $$
  select json_build_object(
    'balance', public.pt_bonus_effective_balance(p_prof),
    'expires_at', case
      when public.pt_bonus_effective_balance(p_prof) > 0 then p_prof.ai_bonus_expires_at
      else null
    end
  );
$$;

-- Comprobar acceso IA (plan primero, luego bono)
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

  if prof.is_admin then
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

revoke all on function public.pt_check_ai_access(text) from public;
grant execute on function public.pt_check_ai_access(text) to service_role;

-- Registrar uso tras respuesta IA exitosa
create or replace function public.pt_record_ai_usage(p_user_id text, p_mode text, p_source text default 'plan')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  new_bal int;
begin
  insert into public.pt_ai_usage (user_id, mode)
  values (p_user_id, coalesce(p_mode, 'report'));

  insert into public.pt_usage_monthly (user_id, usage_month, ai_reports)
  values (p_user_id, public.pt_month_start_utc(), 1)
  on conflict (user_id, usage_month) do update
  set ai_reports = pt_usage_monthly.ai_reports + 1;

  if p_source = 'bonus' then
    select * into prof from public.pt_user_profiles where user_id = p_user_id for update;
    if not found then
      return json_build_object('ok', false, 'error', 'user_not_found');
    end if;
    if public.pt_bonus_effective_balance(prof) <= 0 then
      return json_build_object('ok', false, 'error', 'no_bonus');
    end if;
    new_bal := prof.ai_bonus_balance - 1;
    update public.pt_user_profiles
    set ai_bonus_balance = new_bal
    where user_id = p_user_id;
    insert into public.pt_ai_bonus_ledger (user_id, delta, balance_after, reason)
    values (p_user_id, -1, new_bal, 'ai_usage');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_record_ai_usage(text, text, text) from public;
grant execute on function public.pt_record_ai_usage(text, text, text) to service_role;

-- Acreditar bono tras pago Stripe (idempotente por session_id)
create or replace function public.pt_credit_ai_bonus(
  p_user_id text,
  p_credits int,
  p_pack_code text,
  p_stripe_session_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  new_bal int;
  new_exp timestamptz;
begin
  if p_credits is null or p_credits <= 0 then
    return json_build_object('ok', false, 'error', 'invalid_credits');
  end if;

  if p_stripe_session_id is not null then
    if exists (
      select 1 from public.pt_ai_bonus_ledger
      where stripe_session_id = p_stripe_session_id and delta > 0
    ) then
      select ai_bonus_balance into new_bal
      from public.pt_user_profiles where user_id = p_user_id;
      return json_build_object('ok', true, 'duplicate', true, 'balance', coalesce(new_bal, 0));
    end if;
  end if;

  select * into prof from public.pt_user_profiles where user_id = p_user_id for update;
  if not found then
    insert into public.pt_user_profiles (user_id, email, name, last_seen_at)
    values (p_user_id, '', '', now())
    returning * into prof;
  end if;

  new_exp := timezone('utc', now()) + interval '12 months';

  if prof.ai_bonus_balance > 0
     and prof.ai_bonus_expires_at is not null
     and prof.ai_bonus_expires_at > timezone('utc', now()) then
    new_bal := prof.ai_bonus_balance + p_credits;
    new_exp := greatest(prof.ai_bonus_expires_at, timezone('utc', now()) + interval '12 months');
  else
    new_bal := p_credits;
  end if;

  update public.pt_user_profiles
  set ai_bonus_balance = new_bal,
      ai_bonus_expires_at = new_exp
  where user_id = p_user_id;

  insert into public.pt_ai_bonus_ledger (
    user_id, delta, balance_after, reason, stripe_session_id, pack_code
  ) values (
    p_user_id, p_credits, new_bal, 'purchase', p_stripe_session_id, p_pack_code
  );

  return json_build_object('ok', true, 'balance', new_bal, 'expires_at', new_exp);
end;
$$;

revoke all on function public.pt_credit_ai_bonus(text, int, text, text) from public;
grant execute on function public.pt_credit_ai_bonus(text, int, text, text) to service_role;

-- Entitlements: uso IA desde pt_ai_usage + bono
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
