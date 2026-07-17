-- Promociones: enlaces de registro con plan y/o bono IA para usuarios nuevos.

create table if not exists public.pt_promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null default '',
  description text not null default '',
  plan text check (plan is null or plan in ('pro', 'premium')),
  plan_duration_months int check (plan_duration_months is null or (plan_duration_months >= 1 and plan_duration_months <= 24)),
  bonus_credits int not null default 0 check (bonus_credits >= 0 and bonus_credits <= 500),
  max_redemptions int not null check (max_redemptions >= 1 and max_redemptions <= 100000),
  used_count int not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pt_promotions_gift_chk check (
    plan is not null or bonus_credits > 0
  ),
  constraint pt_promotions_plan_duration_chk check (
    (plan is null and plan_duration_months is null)
    or (plan is not null and plan_duration_months is not null)
  )
);

create index if not exists pt_promotions_active_idx
  on public.pt_promotions (is_active, created_at desc);

create table if not exists public.pt_promotion_redemptions (
  id bigserial primary key,
  promotion_id uuid not null references public.pt_promotions(id) on delete cascade,
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  code text not null,
  plan_granted text,
  plan_ends_at timestamptz,
  bonus_credits_granted int not null default 0,
  redeemed_at timestamptz not null default timezone('utc', now()),
  unique (promotion_id, user_id)
);

create index if not exists pt_promotion_redemptions_user_idx
  on public.pt_promotion_redemptions (user_id, redeemed_at desc);

create index if not exists pt_promotion_redemptions_code_idx
  on public.pt_promotion_redemptions (code);

alter table public.pt_promotions enable row level security;
alter table public.pt_promotion_redemptions enable row level security;

-- Sin políticas de tabla: acceso solo vía RPCs security definer.

create or replace function public.pt_promo_normalize_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(trim(coalesce(p_code, '')));
$$;

create or replace function public.pt_promo_plan_label(p_plan text)
returns text
language sql
immutable
as $$
  select case p_plan
    when 'pro' then 'Study'
    when 'premium' then 'Coach'
    else null
  end;
$$;

create or replace function public.pt_promo_is_available(p public.pt_promotions)
returns boolean
language sql
stable
as $$
  select p.is_active and p.used_count < p.max_redemptions;
$$;

create or replace function public.pt_promo_public_json(p public.pt_promotions)
returns json
language plpgsql
stable
as $$
declare
  available boolean;
  reason text := null;
begin
  available := public.pt_promo_is_available(p);
  if not p.is_active then
    reason := 'inactive';
  elsif p.used_count >= p.max_redemptions then
    reason := 'exhausted';
  end if;

  return json_build_object(
    'ok', true,
    'available', available,
    'reason', reason,
    'code', p.code,
    'title', p.title,
    'description', p.description,
    'plan', p.plan,
    'plan_label', public.pt_promo_plan_label(p.plan),
    'plan_duration_months', p.plan_duration_months,
    'bonus_credits', nullif(p.bonus_credits, 0),
    'max_redemptions', p.max_redemptions,
    'used_count', p.used_count,
    'is_active', p.is_active
  );
end;
$$;

-- Lectura pública (landing sin login)
create or replace function public.pt_get_promotion_public(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  code text := public.pt_promo_normalize_code(p_code);
  p public.pt_promotions;
begin
  if code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select * into p from public.pt_promotions where pt_promotions.code = code;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return public.pt_promo_public_json(p);
end;
$$;

revoke all on function public.pt_get_promotion_public(text) from public;
grant execute on function public.pt_get_promotion_public(text) to anon, authenticated;

create or replace function public.pt_admin_list_promotions()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rows json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(json_agg(row_to_json(x) order by x.created_at desc), '[]'::json)
  into rows
  from (
    select
      id, code, title, description, plan,
      public.pt_promo_plan_label(plan) as plan_label,
      plan_duration_months, bonus_credits,
      max_redemptions, used_count, is_active,
      public.pt_promo_is_available(p) as available,
      created_by, created_at, updated_at
    from public.pt_promotions p
  ) x;

  return json_build_object('ok', true, 'promotions', rows);
end;
$$;

revoke all on function public.pt_admin_list_promotions() from public;
grant execute on function public.pt_admin_list_promotions() to authenticated;

create or replace function public.pt_admin_create_promotion(
  p_title text,
  p_description text default '',
  p_plan text default null,
  p_plan_duration_months int default null,
  p_bonus_credits int default 0,
  p_max_redemptions int default 100,
  p_code text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  code text;
  plan text := nullif(trim(coalesce(p_plan, '')), '');
  bonus int := coalesce(p_bonus_credits, 0);
  months int := p_plan_duration_months;
  title text := trim(coalesce(p_title, ''));
  descr text := trim(coalesce(p_description, ''));
  max_n int := coalesce(p_max_redemptions, 100);
  p public.pt_promotions;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  if title = '' then
    raise exception 'invalid_title';
  end if;

  if plan is not null and plan not in ('pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  if plan is null then
    months := null;
  else
    if months is null or months < 1 or months > 24 then
      raise exception 'invalid_duration';
    end if;
  end if;

  if bonus < 0 or bonus > 500 then
    raise exception 'invalid_bonus';
  end if;

  if plan is null and bonus <= 0 then
    raise exception 'gift_required';
  end if;

  if max_n < 1 or max_n > 100000 then
    raise exception 'invalid_max';
  end if;

  code := public.pt_promo_normalize_code(p_code);
  if code = '' then
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;

  if exists (select 1 from public.pt_promotions where pt_promotions.code = code) then
    raise exception 'code_exists';
  end if;

  insert into public.pt_promotions (
    code, title, description, plan, plan_duration_months,
    bonus_credits, max_redemptions, used_count, is_active, created_by
  ) values (
    code, title, descr, plan, months,
    bonus, max_n, 0, true, uid
  )
  returning * into p;

  return json_build_object(
    'ok', true,
    'promotion', (
      select public.pt_promo_public_json(p)::jsonb || jsonb_build_object(
        'id', p.id,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
    )::json
  );
end;
$$;

revoke all on function public.pt_admin_create_promotion(text, text, text, int, int, int, text) from public;
grant execute on function public.pt_admin_create_promotion(text, text, text, int, int, int, text) to authenticated;

create or replace function public.pt_admin_update_promotion(
  p_id uuid,
  p_is_active boolean default null,
  p_used_count int default null,
  p_max_redemptions int default null,
  p_title text default null,
  p_description text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pt_promotions;
  new_used int;
  new_max int;
  new_active boolean;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select * into p from public.pt_promotions where id = p_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  new_used := coalesce(p_used_count, p.used_count);
  new_max := coalesce(p_max_redemptions, p.max_redemptions);

  if new_used < 0 then
    raise exception 'invalid_used';
  end if;
  if new_max < 1 or new_max > 100000 then
    raise exception 'invalid_max';
  end if;

  new_active := coalesce(p_is_active, p.is_active);
  if new_used >= new_max then
    new_active := false;
  end if;

  update public.pt_promotions
  set
    is_active = new_active,
    used_count = new_used,
    max_redemptions = new_max,
    title = coalesce(nullif(trim(p_title), ''), title),
    description = case when p_description is null then description else trim(p_description) end,
    updated_at = timezone('utc', now())
  where id = p_id
  returning * into p;

  return json_build_object(
    'ok', true,
    'promotion', (
      select public.pt_promo_public_json(p)::jsonb || jsonb_build_object(
        'id', p.id,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
    )::json
  );
end;
$$;

revoke all on function public.pt_admin_update_promotion(uuid, boolean, int, int, text, text) from public;
grant execute on function public.pt_admin_update_promotion(uuid, boolean, int, int, text, text) to authenticated;

-- Canjea la promoción para el usuario autenticado (solo cuentas nuevas).
create or replace function public.pt_redeem_promotion(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  code text := public.pt_promo_normalize_code(p_code);
  p public.pt_promotions;
  prof public.pt_user_profiles;
  auth_created timestamptz;
  period_end timestamptz := null;
  new_bal int;
  new_exp timestamptz;
  plan_label text;
  descr text;
  months_label text;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select created_at into auth_created
  from auth.users
  where id = auth.uid();

  if auth_created is null then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  -- Solo altas recientes (ventana de registro / OAuth).
  if auth_created < timezone('utc', now()) - interval '2 hours' then
    return json_build_object('ok', false, 'error', 'existing_user');
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid for update;
  if not found then
    return json_build_object('ok', false, 'error', 'profile_missing');
  end if;

  if exists (
    select 1 from public.pt_promotion_redemptions where user_id = uid
  ) then
    return json_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  -- No regalar a quien ya tiene suscripción de pago.
  if prof.stripe_subscription_id is not null
     or (prof.plan in ('pro', 'premium') and prof.subscription_status in ('active', 'trialing', 'canceling')) then
    return json_build_object('ok', false, 'error', 'existing_user');
  end if;

  select * into p from public.pt_promotions where pt_promotions.code = code for update;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.pt_promo_is_available(p) then
    return json_build_object(
      'ok', false,
      'error', case when not p.is_active then 'inactive' else 'exhausted' end
    );
  end if;

  plan_label := public.pt_promo_plan_label(p.plan);

  if p.plan is not null then
    period_end := timezone('utc', now()) + make_interval(months => p.plan_duration_months);
    update public.pt_user_profiles
    set
      plan = p.plan,
      subscription_status = 'trialing',
      subscription_period_end = period_end,
      subscription_cancel_at_period_end = true,
      billing_interval = 'month',
      ai_monthly_limit = null
    where user_id = uid;

    months_label := p.plan_duration_months::text ||
      case when p.plan_duration_months = 1 then ' mes' else ' meses' end;
    descr := 'Promoción ' || p.code || ' — ' || plan_label || ' ' || months_label || ' gratis';

    insert into public.pt_payment_ledger (
      user_id, kind, description, amount_cents, currency, plan, pack_code, paid_at
    ) values (
      uid, 'promo', descr, 0, 'eur', p.plan, p.code, timezone('utc', now())
    );
  end if;

  if p.bonus_credits > 0 then
    select * into prof from public.pt_user_profiles where user_id = uid for update;

    new_exp := timezone('utc', now()) + interval '12 months';
    if prof.ai_bonus_balance > 0
       and prof.ai_bonus_expires_at is not null
       and prof.ai_bonus_expires_at > timezone('utc', now()) then
      new_bal := prof.ai_bonus_balance + p.bonus_credits;
      new_exp := greatest(prof.ai_bonus_expires_at, timezone('utc', now()) + interval '12 months');
    else
      new_bal := p.bonus_credits;
    end if;

    update public.pt_user_profiles
    set ai_bonus_balance = new_bal,
        ai_bonus_expires_at = new_exp
    where user_id = uid;

    insert into public.pt_ai_bonus_ledger (
      user_id, delta, balance_after, reason, pack_code
    ) values (
      uid, p.bonus_credits, new_bal, 'promo', p.code
    );
  end if;

  insert into public.pt_promotion_redemptions (
    promotion_id, user_id, code, plan_granted, plan_ends_at, bonus_credits_granted
  ) values (
    p.id, uid, p.code, p.plan, period_end, coalesce(p.bonus_credits, 0)
  );

  update public.pt_promotions
  set
    used_count = used_count + 1,
    is_active = case when used_count + 1 >= max_redemptions then false else is_active end,
    updated_at = timezone('utc', now())
  where id = p.id
  returning * into p;

  return json_build_object(
    'ok', true,
    'code', code,
    'plan', p.plan,
    'plan_label', plan_label,
    'plan_ends_at', period_end,
    'bonus_credits', nullif(p.bonus_credits, 0),
    'promotion', public.pt_promo_public_json(p)
  );
end;
$$;

revoke all on function public.pt_redeem_promotion(text) from public;
grant execute on function public.pt_redeem_promotion(text) to authenticated;

-- Incluir promociones en trialing al expirar (ya cubierto) y también canceling sin Stripe.
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
    billing_interval = null,
    subscription_cancel_at_period_end = false
  where
    user_id <> 'pt_demo_user'
    and is_admin = false
    and plan in ('pro', 'premium')
    and subscription_period_end is not null
    and subscription_period_end < timezone('utc', now())
    and (
      subscription_status in ('active', 'trialing', 'past_due')
      or (
        subscription_status = 'canceling'
        and stripe_subscription_id is null
      )
    );

  get diagnostics n = row_count;

  return json_build_object('ok', true, 'expired', n, 'run_at', timezone('utc', now()));
end;
$$;

revoke all on function public.pt_expire_subscriptions() from public;
