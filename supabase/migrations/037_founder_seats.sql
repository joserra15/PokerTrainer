-- FOUNDER seats: flag en perfil, solicitud vía Contacto, admin update/list/detail.

alter table public.pt_user_profiles
  add column if not exists is_founder boolean not null default false;

alter table public.pt_user_profiles
  add column if not exists founder_requested_at timestamptz;

comment on column public.pt_user_profiles.is_founder is
  'Plaza FOUNDER confirmada por admin (prioridad en lanzamiento 15 nov 2026).';
comment on column public.pt_user_profiles.founder_requested_at is
  'Momento en que el usuario envió Solicitud de Founder por Contacto.';

-- Solicitud de plaza: crea hilo de soporte y marca founder_requested_at.
create or replace function public.pt_request_founder_seat()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prof public.pt_user_profiles;
  existing_id uuid;
  new_thread_id uuid;
  subj text := 'Solicitud de Founder';
  body text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid;
  if not found then
    raise exception 'user_not_found';
  end if;

  if coalesce(prof.is_founder, false) then
    return json_build_object(
      'ok', true,
      'already_founder', true,
      'is_founder', true,
      'founder_requested_at', prof.founder_requested_at
    );
  end if;

  select t.id into existing_id
  from public.pt_contact_threads t
  where t.user_id = uid
    and lower(t.subject) = lower(subj)
  order by t.created_at desc
  limit 1;

  if existing_id is not null then
    update public.pt_user_profiles
    set founder_requested_at = coalesce(founder_requested_at, timezone('utc', now()))
    where user_id = uid;

    return json_build_object(
      'ok', true,
      'already_requested', true,
      'thread_id', existing_id,
      'is_founder', false,
      'founder_requested_at', coalesce(prof.founder_requested_at, timezone('utc', now()))
    );
  end if;

  body := 'Quiero reservar una plaza en el plan FOUNDER '
    || '(lanzamiento 15 de noviembre de 2026, 40% de descuento, plazas limitadas). '
    || 'Prioridad para usuarios ya registrados. '
    || 'Email: ' || coalesce(prof.email, '') || '.';

  insert into public.pt_contact_threads (
    user_id, user_email, user_name, subject, admin_unread_count, user_unread_count
  ) values (
    uid,
    coalesce(prof.email, ''),
    coalesce(prof.name, ''),
    subj,
    1,
    0
  ) returning id into new_thread_id;

  insert into public.pt_contact_messages (
    thread_id, sender_role, sender_id, body
  ) values (
    new_thread_id, 'user', uid, body
  );

  update public.pt_user_profiles
  set founder_requested_at = timezone('utc', now())
  where user_id = uid;

  return json_build_object(
    'ok', true,
    'created', true,
    'thread_id', new_thread_id,
    'is_founder', false,
    'founder_requested_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.pt_request_founder_seat() from public;
grant execute on function public.pt_request_founder_seat() to authenticated;

-- Admin update: añade p_is_founder
drop function if exists public.pt_admin_update_user(text, text, boolean, timestamptz);

create function public.pt_admin_update_user(
  p_user_id text,
  p_plan text default null,
  p_is_admin boolean default null,
  p_subscription_period_end timestamptz default null,
  p_is_founder boolean default null
)
returns public.pt_user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pt_user_profiles;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  if p_plan is not null and p_plan not in ('free', 'pro', 'premium') then
    raise exception 'invalid_plan';
  end if;

  update public.pt_user_profiles
  set
    plan = coalesce(p_plan, plan),
    is_admin = coalesce(p_is_admin, is_admin),
    is_founder = coalesce(p_is_founder, is_founder),
    ai_monthly_limit = case when p_plan is not null then null else ai_monthly_limit end,
    subscription_status = case
      when p_plan = 'free' then 'none'
      when p_plan in ('pro', 'premium') and p_subscription_period_end is not null
        and p_subscription_period_end > timezone('utc', now()) then 'active'
      when p_plan in ('pro', 'premium') then 'active'
      when p_subscription_period_end is not null
        and p_subscription_period_end <= timezone('utc', now())
        and plan = 'free' then 'expired'
      else subscription_status
    end,
    subscription_period_end = case
      when p_subscription_period_end is not null then p_subscription_period_end
      when p_plan = 'free' then null
      else subscription_period_end
    end,
    billing_interval = case
      when p_plan = 'free' then null
      else billing_interval
    end,
    stripe_subscription_id = case
      when p_plan = 'free' then null
      else stripe_subscription_id
    end
  where user_id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;

  select * into r from public.pt_user_profiles where user_id = p_user_id;
  return r;
end;
$$;

revoke all on function public.pt_admin_update_user(text, text, boolean, timestamptz, boolean) from public;
grant execute on function public.pt_admin_update_user(text, text, boolean, timestamptz, boolean) to authenticated;

-- Lista admin con is_founder
drop function if exists public.pt_admin_user_list();

create function public.pt_admin_user_list()
returns table (
  user_id text,
  email text,
  name text,
  plan text,
  is_admin boolean,
  is_founder boolean,
  founder_requested_at timestamptz,
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
    coalesce(p.is_founder, false) as is_founder,
    p.founder_requested_at,
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

-- Detalle admin: incluir founder en profile
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
  promos json;
  state_row public.pt_user_state;
  stats jsonb;
  payload jsonb;
  decisions int;
  optima int;
  aceptable int;
  accuracy int;
  import_sessions int;
  trainer_hands_tracked int;
  session_stubs int;
  activity json;
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

  select coalesce(json_agg(row_to_json(pr) order by pr.redeemed_at desc), '[]'::json)
  into promos
  from (
    select
      r.id,
      r.promotion_id,
      r.code,
      r.plan_granted,
      public.pt_promo_plan_label(r.plan_granted) as plan_label,
      r.plan_ends_at,
      r.bonus_credits_granted,
      r.redeemed_at,
      p.title as promotion_title
    from public.pt_promotion_redemptions r
    left join public.pt_promotions p on p.id = r.promotion_id
    where r.user_id = p_user_id
    order by r.redeemed_at desc
    limit 20
  ) pr;

  select * into state_row from public.pt_user_state where user_id = p_user_id;
  payload := coalesce(state_row.payload, '{}'::jsonb);
  stats := coalesce(payload->'stats', '{}'::jsonb);
  decisions := coalesce((stats->>'decisions')::int, 0);
  optima := coalesce((stats->>'optima')::int, 0);
  aceptable := coalesce((stats->>'aceptable')::int, 0);
  accuracy := case when decisions > 0
    then round(((optima + aceptable)::numeric / decisions::numeric) * 100)::int
    else null
  end;

  select count(*)::int into import_sessions
  from public.pt_import_sessions
  where user_id = p_user_id and deleted_at is null;

  select count(*)::int into trainer_hands_tracked
  from jsonb_object_keys(coalesce(stats#>'{aggregates,trainerByHandId}', '{}'::jsonb));

  select count(*)::int into session_stubs
  from jsonb_object_keys(coalesce(stats#>'{aggregates,sessionById}', '{}'::jsonb));

  activity := json_build_object(
    'has_cloud_data', state_row.user_id is not null,
    'synced_at', state_row.updated_at,
    'stats_updated_at', nullif(stats->>'updatedAt', ''),
    'hands_played', coalesce((stats->>'handsPlayed')::int, 0),
    'decisions', decisions,
    'optima', optima,
    'aceptable', aceptable,
    'imprecisa', coalesce((stats->>'imprecisa')::int, 0),
    'error', coalesce((stats->>'error')::int, 0),
    'accuracy_pct', accuracy,
    'total_ev_loss', coalesce((stats->>'totalEvLoss')::numeric, 0),
    'total_net', coalesce((stats->>'totalNet')::numeric, 0),
    'history_count', coalesce(jsonb_array_length(coalesce(payload->'history', '[]'::jsonb)), 0),
    'errors_count', coalesce(jsonb_array_length(coalesce(payload->'errors', '[]'::jsonb)), 0),
    'import_sessions', coalesce(import_sessions, 0),
    'trainer_hands_tracked', coalesce(trainer_hands_tracked, 0),
    'session_stubs', coalesce(session_stubs, 0),
    'last_seen_at', prof.last_seen_at
  );

  return json_build_object(
    'profile', json_build_object(
      'user_id', prof.user_id,
      'email', prof.email,
      'name', prof.name,
      'plan', prof.plan,
      'is_admin', prof.is_admin,
      'is_founder', coalesce(prof.is_founder, false),
      'founder_requested_at', prof.founder_requested_at,
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
    'contact_threads', threads,
    'promotion_redemptions', promos,
    'activity', activity
  );
end;
$$;

revoke all on function public.pt_admin_user_detail(text) from public;
grant execute on function public.pt_admin_user_detail(text) to authenticated;

-- Account settings: exponer founder
create or replace function public.pt_get_account_settings()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prof public.pt_user_profiles;
  ent json;
  payments json;
  bonus json;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid;
  if not found then
    raise exception 'user_not_found';
  end if;

  ent := public.pt_build_entitlements_json(uid, true);

  select coalesce(json_agg(row_to_json(p) order by p.paid_at desc), '[]'::json)
  into payments
  from (
    select id, kind, description, amount_cents, currency, plan, pack_code,
           stripe_session_id, stripe_invoice_id, paid_at
    from public.pt_payment_ledger
    where user_id = uid
    order by paid_at desc
    limit 100
  ) p;

  select coalesce(json_agg(row_to_json(b) order by b.created_at desc), '[]'::json)
  into bonus
  from (
    select id, delta, balance_after, reason, pack_code, stripe_session_id, created_at
    from public.pt_ai_bonus_ledger
    where user_id = uid
    order by created_at desc
    limit 50
  ) b;

  return json_build_object(
    'profile', json_build_object(
      'user_id', prof.user_id,
      'email', prof.email,
      'name', prof.name,
      'plan', prof.plan,
      'is_admin', public.pt_profile_is_admin(prof),
      'is_founder', coalesce(prof.is_founder, false),
      'founder_requested_at', prof.founder_requested_at,
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
    'entitlements', ent,
    'payments', payments,
    'bonus_ledger', bonus
  );
end;
$$;

revoke all on function public.pt_get_account_settings() from public;
grant execute on function public.pt_get_account_settings() to authenticated;

-- Entitlements: is_founder + founder_requested_at
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
    'is_founder', coalesce(prof.is_founder, false),
    'founder_requested_at', prof.founder_requested_at,
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
