-- Admin: avance Escuela + estadísticas de uso (global e individual).

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
  school jsonb;
  feature_usage jsonb;
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
  school := coalesce(stats->'school', '{}'::jsonb);
  feature_usage := coalesce(stats->'featureUsage', '{}'::jsonb);
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
    'last_seen_at', prof.last_seen_at,
    'school', school,
    'feature_usage', feature_usage
  );

  return json_build_object(
    'profile', json_build_object(
      'user_id', prof.user_id,
      'email', prof.email,
      'name', prof.name,
      'plan', prof.plan,
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

-- Resumen global de uso de funciones + Escuela + IA
create or replace function public.pt_admin_usage_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  ai_today json;
  ai_30d json;
  ai_month json;
  users_usage json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(json_object_agg(mode, cnt), '{}'::json)
  into ai_today
  from (
    select coalesce(nullif(mode, ''), 'report') as mode, count(*)::int as cnt
    from public.pt_ai_usage
    where created_at >= date_trunc('day', now() at time zone 'utc')
    group by 1
  ) t;

  select coalesce(json_object_agg(mode, cnt), '{}'::json)
  into ai_30d
  from (
    select coalesce(nullif(mode, ''), 'report') as mode, count(*)::int as cnt
    from public.pt_ai_usage
    where created_at >= now() - interval '30 days'
    group by 1
  ) t;

  select coalesce(json_object_agg(mode, cnt), '{}'::json)
  into ai_month
  from (
    select coalesce(nullif(mode, ''), 'report') as mode, count(*)::int as cnt
    from public.pt_ai_usage
    where created_at >= public.pt_month_start_utc()
    group by 1
  ) t;

  select coalesce(json_agg(row_to_json(u) order by u.email), '[]'::json)
  into users_usage
  from (
    select
      p.user_id,
      p.email,
      p.name,
      p.plan,
      p.last_seen_at,
      coalesce(s.payload->'stats'->'featureUsage', '{}'::jsonb) as feature_usage,
      coalesce(s.payload->'stats'->'school', '{}'::jsonb) as school,
      coalesce((s.payload->'stats'->>'handsPlayed')::int, 0) as hands_played,
      coalesce((s.payload->'stats'->>'decisions')::int, 0) as decisions
    from public.pt_user_profiles p
    left join public.pt_user_state s on s.user_id = p.user_id
    where s.payload->'stats'->'featureUsage' is not null
       or s.payload->'stats'->'school' is not null
       or coalesce((s.payload->'stats'->>'handsPlayed')::int, 0) > 0
       or coalesce((s.payload->'stats'->>'decisions')::int, 0) > 0
    order by p.email nulls last
    limit 2000
  ) u;

  select json_build_object(
    'ai_by_mode_today', ai_today,
    'ai_by_mode_30d', ai_30d,
    'ai_by_mode_month', ai_month,
    'ai_requests_today', (
      select count(*)::int from public.pt_ai_usage
      where created_at >= date_trunc('day', now() at time zone 'utc')
    ),
    'ai_requests_30d', (
      select count(*)::int from public.pt_ai_usage
      where created_at >= now() - interval '30 days'
    ),
    'ai_requests_month', (
      select count(*)::int from public.pt_ai_usage
      where created_at >= public.pt_month_start_utc()
    ),
    'users', users_usage
  ) into result;

  return result;
end;
$$;

revoke all on function public.pt_admin_usage_stats() from public;
grant execute on function public.pt_admin_usage_stats() to authenticated;
