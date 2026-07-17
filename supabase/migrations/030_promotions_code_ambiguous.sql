-- Fix: variables PL/pgSQL no deben llamarse igual que columnas (code/plan/title).

create or replace function public.pt_get_promotion_public(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.pt_promo_normalize_code(p_code);
  promo public.pt_promotions;
begin
  if v_code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select * into promo
  from public.pt_promotions
  where pt_promotions.code = v_code;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return public.pt_promo_public_json(promo);
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
      p.id,
      p.code,
      p.title,
      p.description,
      p.plan,
      public.pt_promo_plan_label(p.plan) as plan_label,
      p.plan_duration_months,
      p.bonus_credits,
      p.max_redemptions,
      p.used_count,
      p.is_active,
      public.pt_promo_is_available(p) as available,
      p.created_by,
      p.created_at,
      p.updated_at
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
  v_code text;
  v_plan text := nullif(trim(coalesce(p_plan, '')), '');
  v_bonus int := coalesce(p_bonus_credits, 0);
  v_months int := p_plan_duration_months;
  v_title text := trim(coalesce(p_title, ''));
  v_descr text := trim(coalesce(p_description, ''));
  v_max int := coalesce(p_max_redemptions, 100);
  promo public.pt_promotions;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  if v_title = '' then
    raise exception 'invalid_title';
  end if;

  if v_plan is not null and v_plan not in ('pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  if v_plan is null then
    v_months := null;
  else
    if v_months is null or v_months < 1 or v_months > 24 then
      raise exception 'invalid_duration';
    end if;
  end if;

  if v_bonus < 0 or v_bonus > 500 then
    raise exception 'invalid_bonus';
  end if;

  if v_plan is null and v_bonus <= 0 then
    raise exception 'gift_required';
  end if;

  if v_max < 1 or v_max > 100000 then
    raise exception 'invalid_max';
  end if;

  v_code := public.pt_promo_normalize_code(p_code);
  if v_code = '' then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;

  if exists (
    select 1 from public.pt_promotions where pt_promotions.code = v_code
  ) then
    raise exception 'code_exists';
  end if;

  insert into public.pt_promotions (
    code, title, description, plan, plan_duration_months,
    bonus_credits, max_redemptions, used_count, is_active, created_by
  ) values (
    v_code, v_title, v_descr, v_plan, v_months,
    v_bonus, v_max, 0, true, uid
  )
  returning * into promo;

  return json_build_object(
    'ok', true,
    'promotion', (
      select public.pt_promo_public_json(promo)::jsonb || jsonb_build_object(
        'id', promo.id,
        'created_at', promo.created_at,
        'updated_at', promo.updated_at
      )
    )::json
  );
end;
$$;

revoke all on function public.pt_admin_create_promotion(text, text, text, int, int, int, text) from public;
grant execute on function public.pt_admin_create_promotion(text, text, text, int, int, int, text) to authenticated;

create or replace function public.pt_redeem_promotion(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  v_code text := public.pt_promo_normalize_code(p_code);
  promo public.pt_promotions;
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
  if v_code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select created_at into auth_created
  from auth.users
  where id = auth.uid();

  if auth_created is null then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

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

  if prof.stripe_subscription_id is not null
     or (prof.plan in ('pro', 'premium') and prof.subscription_status in ('active', 'trialing', 'canceling')) then
    return json_build_object('ok', false, 'error', 'existing_user');
  end if;

  select * into promo
  from public.pt_promotions
  where pt_promotions.code = v_code
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.pt_promo_is_available(promo) then
    return json_build_object(
      'ok', false,
      'error', case when not promo.is_active then 'inactive' else 'exhausted' end
    );
  end if;

  plan_label := public.pt_promo_plan_label(promo.plan);

  if promo.plan is not null then
    period_end := timezone('utc', now()) + make_interval(months => promo.plan_duration_months);
    update public.pt_user_profiles
    set
      plan = promo.plan,
      subscription_status = 'trialing',
      subscription_period_end = period_end,
      subscription_cancel_at_period_end = true,
      billing_interval = 'month',
      ai_monthly_limit = null
    where user_id = uid;

    months_label := promo.plan_duration_months::text ||
      case when promo.plan_duration_months = 1 then ' mes' else ' meses' end;
    descr := 'Promoción ' || promo.code || ' — ' || plan_label || ' ' || months_label || ' gratis';

    insert into public.pt_payment_ledger (
      user_id, kind, description, amount_cents, currency, plan, pack_code, paid_at
    ) values (
      uid, 'promo', descr, 0, 'eur', promo.plan, promo.code, timezone('utc', now())
    );
  end if;

  if promo.bonus_credits > 0 then
    select * into prof from public.pt_user_profiles where user_id = uid for update;

    new_exp := timezone('utc', now()) + interval '12 months';
    if prof.ai_bonus_balance > 0
       and prof.ai_bonus_expires_at is not null
       and prof.ai_bonus_expires_at > timezone('utc', now()) then
      new_bal := prof.ai_bonus_balance + promo.bonus_credits;
      new_exp := greatest(prof.ai_bonus_expires_at, timezone('utc', now()) + interval '12 months');
    else
      new_bal := promo.bonus_credits;
    end if;

    update public.pt_user_profiles
    set ai_bonus_balance = new_bal,
        ai_bonus_expires_at = new_exp
    where user_id = uid;

    insert into public.pt_ai_bonus_ledger (
      user_id, delta, balance_after, reason, pack_code
    ) values (
      uid, promo.bonus_credits, new_bal, 'promo', promo.code
    );
  end if;

  insert into public.pt_promotion_redemptions (
    promotion_id, user_id, code, plan_granted, plan_ends_at, bonus_credits_granted
  ) values (
    promo.id, uid, promo.code, promo.plan, period_end, coalesce(promo.bonus_credits, 0)
  );

  update public.pt_promotions
  set
    used_count = used_count + 1,
    is_active = case when used_count + 1 >= max_redemptions then false else is_active end,
    updated_at = timezone('utc', now())
  where id = promo.id
  returning * into promo;

  return json_build_object(
    'ok', true,
    'code', v_code,
    'plan', promo.plan,
    'plan_label', plan_label,
    'plan_ends_at', period_end,
    'bonus_credits', nullif(promo.bonus_credits, 0),
    'promotion', public.pt_promo_public_json(promo)
  );
end;
$$;

revoke all on function public.pt_redeem_promotion(text) from public;
grant execute on function public.pt_redeem_promotion(text) to authenticated;
