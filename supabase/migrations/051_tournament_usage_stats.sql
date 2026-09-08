-- Uso de Torneos IA en Admin (detalle usuario) y Manager (detalle miembro).
-- Agrega wallet + histórico ya sincronizados en pt_user_state.

create or replace function public.pt_tournament_usage_from_payload(
  p_payload jsonb,
  p_community_id text default null
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  cid text := nullif(trim(coalesce(p_community_id, '')), '');
  suffix text := '';
  wallet_key text;
  history_key text;
  active_key text;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  wallet jsonb;
  history jsonb;
  active jsonb;
  n int := 0;
  wins int := 0;
  itm int := 0;
  place_sum numeric := 0;
  place_n int := 0;
  total_profit numeric := 0;
  total_buy_in numeric := 0;
  role_sum numeric := 0;
  role_n int := 0;
  by_kind jsonb := '{}'::jsonb;
  last_finished timestamptz := null;
  row_item jsonb;
  place numeric;
  buy_in numeric;
  prize numeric;
  profit numeric;
  kind text;
  kind_count int;
  played int;
  has_active boolean := false;
  active_at text := null;
begin
  if cid is not null and cid <> 'pokerforge' then
    suffix := '_' || cid;
  end if;

  wallet_key := 'tournamentWallet' || suffix;
  history_key := 'tournamentHistory' || suffix;
  active_key := 'tournamentActive' || suffix;

  wallet := payload -> wallet_key;
  if wallet is null or jsonb_typeof(wallet) <> 'object' then
    wallet := '{}'::jsonb;
  end if;

  history := payload -> history_key;
  if history is null or jsonb_typeof(history) <> 'array' then
    history := '[]'::jsonb;
  end if;

  active := payload -> active_key;
  if active is not null and jsonb_typeof(active) = 'object' and nullif(active->>'id', '') is not null then
    has_active := true;
    active_at := coalesce(nullif(active->>'_savedAt', ''), nullif(active->>'updatedAt', ''));
  end if;

  for row_item in select value from jsonb_array_elements(history)
  loop
    if row_item is null or jsonb_typeof(row_item) <> 'object' then
      continue;
    end if;
    n := n + 1;

    place := nullif(row_item->>'place', '')::numeric;
    buy_in := coalesce(nullif(row_item->>'buyInEur', '')::numeric, 0);
    prize := coalesce(nullif(row_item->>'prizeEur', '')::numeric, 0);
    if row_item ? 'profit' and nullif(row_item->>'profit', '') is not null then
      profit := (row_item->>'profit')::numeric;
    else
      profit := prize - buy_in;
    end if;

    kind := lower(coalesce(nullif(row_item->>'kind', ''), 'mtt'));
    if kind not in ('sng', 'mtt', 'spin') then
      kind := 'mtt';
    end if;
    kind_count := coalesce((by_kind->>kind)::int, 0) + 1;
    by_kind := jsonb_set(by_kind, array[kind], to_jsonb(kind_count), true);

    total_buy_in := total_buy_in + buy_in;
    total_profit := total_profit + profit;

    if place = 1 then
      wins := wins + 1;
    end if;
    if prize > 0 then
      itm := itm + 1;
    end if;
    if place is not null and place > 0 then
      place_sum := place_sum + place;
      place_n := place_n + 1;
    end if;
    if row_item ? 'roleAccuracy' and nullif(row_item->>'roleAccuracy', '') is not null then
      role_sum := role_sum + (row_item->>'roleAccuracy')::numeric;
      role_n := role_n + 1;
    end if;

    begin
      if nullif(row_item->>'finishedAt', '') is not null then
        if last_finished is null or (row_item->>'finishedAt')::timestamptz > last_finished then
          last_finished := (row_item->>'finishedAt')::timestamptz;
        end if;
      end if;
    exception when others then
      null;
    end;
  end loop;

  played := coalesce(nullif(wallet->>'tournamentsPlayed', '')::int, 0);
  if played < n then
    played := n;
  end if;

  return jsonb_build_object(
    'wallet', jsonb_build_object(
      'balance', coalesce(nullif(wallet->>'balance', '')::numeric, 0),
      'tournamentsPlayed', played,
      'updatedAt', nullif(wallet->>'updatedAt', '')
    ),
    'summary', jsonb_build_object(
      'n', n,
      'wins', wins,
      'itm', itm,
      'itm_pct', case when n > 0 then round((itm::numeric / n::numeric) * 1000) / 10 else 0 end,
      'win_pct', case when n > 0 then round((wins::numeric / n::numeric) * 1000) / 10 else 0 end,
      'avg_place', case when place_n > 0 then round((place_sum / place_n) * 10) / 10 else null end,
      'total_profit', round(total_profit * 100) / 100,
      'total_buy_in', round(total_buy_in * 100) / 100,
      'roi_pct', case when total_buy_in > 0
        then round((total_profit / total_buy_in) * 1000) / 10
        else 0 end,
      'avg_role_accuracy', case when role_n > 0
        then round((role_sum / role_n) * 10) / 10
        else 0 end,
      'by_kind', by_kind,
      'last_finished_at', last_finished
    ),
    'has_active', has_active,
    'active_updated_at', active_at
  );
end;
$$;

revoke all on function public.pt_tournament_usage_from_payload(jsonb, text) from public;
grant execute on function public.pt_tournament_usage_from_payload(jsonb, text) to authenticated;

-- Admin detalle usuario: añade bloque Torneos (PokerForge / keys sin sufijo)
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
  tournaments jsonb;
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

  tournaments := public.pt_tournament_usage_from_payload(payload, null);

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
    'activity', activity,
    'tournaments', tournaments
  );
end;
$$;

revoke all on function public.pt_admin_user_detail(text) from public;
grant execute on function public.pt_admin_user_detail(text) to authenticated;

-- Manager detalle miembro: Torneos de la comunidad + leaderboard koins
create or replace function public.pt_manager_member_usage(
  p_community_id text,
  p_user_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  mem public.pt_community_members;
  state json;
  school jsonb;
  cstats json;
  ai_used int;
  uid text := nullif(trim(coalesce(p_user_id, '')), '');
  cid text := nullif(trim(coalesce(p_community_id, '')), '');
  hands int := 0;
  decisions int := 0;
  optima int := 0;
  aceptable int := 0;
  err_n int := 0;
  tournaments jsonb;
  lb_koins numeric := null;
  lb_played int := null;
begin
  if cid is null or cid = 'pokerforge' then
    return json_build_object('ok', false, 'error', 'invalid_community');
  end if;
  if uid is null then
    return json_build_object('ok', false, 'error', 'missing_user');
  end if;

  if not public.pt_is_community_manager(cid) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into mem
  from public.pt_community_members
  where user_id = uid
    and community_id = cid
    and status = 'active';

  if not found then
    select m.* into mem
    from public.pt_community_members m
    join public.pt_user_profiles p on p.user_id = m.user_id
    where m.community_id = cid
      and m.status = 'active'
      and (
        lower(p.email) = lower(uid)
        or p.user_id = uid
      )
    limit 1;
  end if;

  if not found then
    return json_build_object('ok', false, 'error', 'not_a_member', 'user_id', uid, 'community_id', cid);
  end if;

  uid := mem.user_id;

  select * into prof from public.pt_user_profiles where user_id = uid;
  if not found then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  select payload into state
  from public.pt_user_state
  where user_id = uid
  limit 1;

  school := public.pt_community_school_from_payload(cid, coalesce(state::jsonb, '{}'::jsonb));
  cstats := null;
  if state is not null then
    cstats := state -> ('stats_' || cid);
  end if;

  if cstats is not null then
    hands := coalesce((cstats ->> 'handsPlayed')::int, 0);
    decisions := coalesce((cstats ->> 'decisions')::int, 0);
    optima := coalesce((cstats ->> 'optima')::int, 0);
    aceptable := coalesce((cstats ->> 'aceptable')::int, 0);
    err_n := coalesce((cstats ->> 'error')::int, 0);
  end if;

  begin
    ai_used := public.pt_community_ai_usage_month_count(uid, cid);
  exception when others then
    ai_used := 0;
  end;

  tournaments := public.pt_tournament_usage_from_payload(coalesce(state::jsonb, '{}'::jsonb), cid);

  begin
    select k.koins, k.tournaments_played
      into lb_koins, lb_played
    from public.pt_community_tournament_koins k
    where k.community_id = cid
      and k.user_id = uid
    limit 1;
  exception when others then
    lb_koins := null;
    lb_played := null;
  end;

  return json_build_object(
    'ok', true,
    'community_id', cid,
    'scope', 'community_only',
    'member', json_build_object(
      'user_id', prof.user_id,
      'email', prof.email,
      'name', prof.name,
      'role', mem.role,
      'granted_at', mem.granted_at,
      'last_seen_at', prof.last_seen_at,
      'created_at', prof.created_at,
      'is_online', (prof.last_seen_at is not null and prof.last_seen_at > now() - interval '15 minutes')
    ),
    'school', school,
    'training', json_build_object(
      'handsPlayed', hands,
      'decisions', decisions,
      'optima', optima,
      'aceptable', aceptable,
      'error', err_n,
      'accuracy', case when decisions > 0
        then round(((optima + aceptable)::numeric / decisions::numeric) * 100)
        else null end
    ),
    'ai', json_build_object(
      'used', ai_used,
      'limit', public.pt_community_ai_limit(),
      'left', greatest(0, public.pt_community_ai_limit() - ai_used),
      'source', 'community'
    ),
    'tournaments', tournaments,
    'leaderboard', case
      when lb_koins is null and lb_played is null then null
      else json_build_object(
        'koins', coalesce(lb_koins, 0),
        'tournaments_played', coalesce(lb_played, 0)
      )
    end
  );
end;
$$;

revoke all on function public.pt_manager_member_usage(text, text) from public;
grant execute on function public.pt_manager_member_usage(text, text) to authenticated;
