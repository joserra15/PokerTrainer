-- Escuela de comunidad: solo lecciones del pack (MTT LAB = ML-*).
-- Ignora blobs contaminados con progreso PokerForgeAI (C-*, R-*, T-*, etc.).

create or replace function public.pt_community_lesson_prefix(p_community_id text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_community_id, ''))
    when 'mttlab' then 'ML-'
    else null
  end;
$$;

create or replace function public.pt_is_pokerforge_lesson_id(p_id text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_id, '') ~* '^(C-|R-|T-|M0-|D-|O-|B-|F-|E-|Q-|X-|N-|I-|S-|P-|W-|learn-|cash-|spin-)';
$$;

/**
 * Devuelve progreso de escuela SOLO de la comunidad.
 * Si el blob tiene lecciones PokerForge (C-00…) y ninguna del pack, xp=0 y lessons={}.
 */
create or replace function public.pt_community_school_from_payload(
  p_community_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
as $$
declare
  raw jsonb;
  lessons jsonb;
  filtered jsonb := '{}'::jsonb;
  prefix text;
  kid text;
  passed_n int := 0;
  total_n int := 0;
  pf_n int := 0;
  keep_xp boolean := false;
  xp_out int := 0;
begin
  if p_community_id is null or p_community_id = '' or p_community_id = 'pokerforge' then
    return jsonb_build_object('xp', 0, 'lessons', '{}'::jsonb, 'version', 2);
  end if;
  if p_payload is null then
    return jsonb_build_object('xp', 0, 'lessons', '{}'::jsonb, 'version', 2);
  end if;

  raw := p_payload -> ('school_' || p_community_id);
  if raw is null or raw = 'null'::jsonb then
    raw := p_payload -> ('stats_' || p_community_id) -> 'school';
  end if;
  if raw is null or raw = 'null'::jsonb then
    return jsonb_build_object('xp', 0, 'lessons', '{}'::jsonb, 'version', 2);
  end if;

  lessons := coalesce(raw -> 'lessons', '{}'::jsonb);
  if jsonb_typeof(lessons) <> 'object' then
    lessons := '{}'::jsonb;
  end if;

  prefix := public.pt_community_lesson_prefix(p_community_id);

  for kid in select jsonb_object_keys(lessons)
  loop
    if public.pt_is_pokerforge_lesson_id(kid) then
      pf_n := pf_n + 1;
      continue;
    end if;
    if prefix is not null and kid !~* ('^' || prefix) then
      continue;
    end if;
    filtered := filtered || jsonb_build_object(kid, lessons -> kid);
    total_n := total_n + 1;
    if coalesce((lessons -> kid ->> 'passed')::boolean, false) then
      passed_n := passed_n + 1;
    end if;
  end loop;

  /* Contaminado con PF y sin lecciones del pack → vacío */
  if total_n = 0 then
    return jsonb_build_object(
      'xp', 0,
      'lessons', '{}'::jsonb,
      'version', coalesce((raw ->> 'version')::int, 2),
      'filtered', true,
      'rejected_pf', pf_n > 0
    );
  end if;

  /* Solo confiar en XP del blob si no había lecciones PF mezcladas */
  keep_xp := (pf_n = 0);
  if keep_xp then
    xp_out := coalesce((raw ->> 'xp')::int, 0);
  else
    xp_out := 0;
  end if;

  return jsonb_build_object(
    'xp', xp_out,
    'lessons', filtered,
    'version', coalesce((raw ->> 'version')::int, 2),
    'passed', passed_n,
    'lesson_count', total_n,
    'filtered', true
  );
end;
$$;

revoke all on function public.pt_community_lesson_prefix(text) from public;
grant execute on function public.pt_community_lesson_prefix(text) to authenticated;
revoke all on function public.pt_is_pokerforge_lesson_id(text) from public;
grant execute on function public.pt_is_pokerforge_lesson_id(text) to authenticated;
revoke all on function public.pt_community_school_from_payload(text, jsonb) from public;
grant execute on function public.pt_community_school_from_payload(text, jsonb) to authenticated;

-- Listado manager: XP / lecciones solo pack comunidad
create or replace function public.pt_manager_list_members(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rows json;
  online_n int;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(json_agg(row_to_json(x) order by x.last_seen_at desc nulls last), '[]'::json)
  into rows
  from (
    select
      p.user_id,
      p.email,
      p.name,
      m.role,
      m.status,
      m.granted_at,
      p.last_seen_at,
      p.created_at,
      public.pt_community_ai_usage_month_count(p.user_id, p_community_id) as ai_used_month,
      public.pt_community_ai_limit() as ai_limit,
      (p.last_seen_at is not null and p.last_seen_at > now() - interval '15 minutes') as is_online,
      coalesce((
        select (public.pt_community_school_from_payload(p_community_id, us.payload::jsonb) ->> 'xp')::int
        from public.pt_user_state us
        where us.user_id = p.user_id
        limit 1
      ), 0) as school_xp,
      coalesce((
        select (public.pt_community_school_from_payload(p_community_id, us.payload::jsonb) ->> 'passed')::int
        from public.pt_user_state us
        where us.user_id = p.user_id
        limit 1
      ), 0) as school_passed
    from public.pt_community_members m
    join public.pt_user_profiles p on p.user_id = m.user_id
    where m.community_id = p_community_id
      and m.status = 'active'
  ) x;

  select count(*)::int into online_n
  from public.pt_community_members m
  join public.pt_user_profiles p on p.user_id = m.user_id
  where m.community_id = p_community_id
    and m.status = 'active'
    and p.last_seen_at is not null
    and p.last_seen_at > now() - interval '15 minutes';

  return json_build_object(
    'ok', true,
    'community_id', p_community_id,
    'members', rows,
    'online_count', coalesce(online_n, 0),
    'ai_limit', public.pt_community_ai_limit()
  );
end;
$$;

-- Detalle manager: escuela filtrada por pack
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
    )
  );
end;
$$;

-- Admin detalle comunidad: mismos contadores filtrados
create or replace function public.pt_admin_community_detail(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.pt_communities;
  members json;
  online_n int;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select * into c from public.pt_communities where id = p_community_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(json_agg(row_to_json(x) order by x.last_seen_at desc nulls last), '[]'::json)
  into members
  from (
    select
      p.user_id,
      p.email,
      p.name,
      m.role,
      m.status,
      m.granted_at,
      p.last_seen_at,
      p.created_at,
      public.pt_community_ai_usage_month_count(p.user_id, p_community_id) as ai_used_month,
      public.pt_community_ai_limit() as ai_limit,
      (p.last_seen_at is not null and p.last_seen_at > now() - interval '15 minutes') as is_online,
      coalesce((
        select (public.pt_community_school_from_payload(p_community_id, us.payload::jsonb) ->> 'xp')::int
        from public.pt_user_state us
        where us.user_id = p.user_id
        limit 1
      ), 0) as school_xp,
      coalesce((
        select (public.pt_community_school_from_payload(p_community_id, us.payload::jsonb) ->> 'passed')::int
        from public.pt_user_state us
        where us.user_id = p.user_id
        limit 1
      ), 0) as school_passed
    from public.pt_community_members m
    join public.pt_user_profiles p on p.user_id = m.user_id
    where m.community_id = p_community_id
      and m.status = 'active'
  ) x;

  select count(*)::int into online_n
  from public.pt_community_members m
  join public.pt_user_profiles p on p.user_id = m.user_id
  where m.community_id = p_community_id
    and m.status = 'active'
    and p.last_seen_at is not null
    and p.last_seen_at > now() - interval '15 minutes';

  return json_build_object(
    'ok', true,
    'community', json_build_object(
      'id', c.id,
      'name', c.name,
      'entry_path', c.entry_path,
      'active', c.active,
      'join_code', c.join_code,
      'welcome_message', c.welcome_message,
      'created_at', c.created_at,
      'login_url', 'https://www.pokerforgeai.com' || coalesce(nullif(c.entry_path, ''), '/?app=' || c.id)
    ),
    'members', members,
    'online_count', coalesce(online_n, 0),
    'ai_limit', public.pt_community_ai_limit()
  );
end;
$$;

revoke all on function public.pt_manager_list_members(text) from public;
grant execute on function public.pt_manager_list_members(text) to authenticated;
revoke all on function public.pt_manager_member_usage(text, text) from public;
grant execute on function public.pt_manager_member_usage(text, text) to authenticated;
revoke all on function public.pt_admin_community_detail(text) from public;
grant execute on function public.pt_admin_community_detail(text) to authenticated;
