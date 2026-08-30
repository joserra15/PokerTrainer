-- Fixes comunidad: contacto scoped, manager school sin fallback PF, member usage robusto.

-- Contacto: listar hilos filtrados por comunidad (null = PokerForge)
create or replace function public.pt_contact_my_threads(p_community_id text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  cid text := nullif(trim(coalesce(p_community_id, '')), '');
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if cid = 'pokerforge' then cid := null; end if;

  return coalesce((
    select json_agg(row_to_json(x) order by x.last_message_at desc)
    from (
      select id, subject, status, user_unread_count, admin_unread_count,
             last_message_at, created_at, community_id
      from public.pt_contact_threads
      where user_id = uid
        and (
          (cid is null and community_id is null)
          or (cid is not null and community_id = cid)
        )
      order by last_message_at desc
      limit 50
    ) x
  ), '[]'::json);
end;
$$;

revoke all on function public.pt_contact_my_threads(text) from public;
grant execute on function public.pt_contact_my_threads(text) to authenticated;
-- Mantener signature sin args por compat
create or replace function public.pt_contact_my_threads()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.pt_contact_my_threads(null);
end;
$$;

revoke all on function public.pt_contact_my_threads() from public;
grant execute on function public.pt_contact_my_threads() to authenticated;

create or replace function public.pt_contact_unread_count(p_community_id text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  cid text := nullif(trim(coalesce(p_community_id, '')), '');
  n int := 0;
begin
  if uid is null then return 0; end if;
  if cid = 'pokerforge' then cid := null; end if;
  select coalesce(sum(user_unread_count), 0)::int into n
  from public.pt_contact_threads
  where user_id = uid
    and (
      (cid is null and community_id is null)
      or (cid is not null and community_id = cid)
    );
  return n;
end;
$$;

revoke all on function public.pt_contact_unread_count(text) from public;
grant execute on function public.pt_contact_unread_count(text) to authenticated;

create or replace function public.pt_contact_unread_count()
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.pt_contact_unread_count(null);
end;
$$;

revoke all on function public.pt_contact_unread_count() from public;
grant execute on function public.pt_contact_unread_count() to authenticated;

-- Manager list: escuela solo de la comunidad (sin fallback PokerForge)
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
      (
        select coalesce(
          (us.payload -> ('school_' || p_community_id) ->> 'xp')::int,
          (us.payload -> ('stats_' || p_community_id) -> 'school' ->> 'xp')::int,
          0
        )
        from public.pt_user_state us
        where us.user_id = p.user_id
        limit 1
      ) as school_xp,
      (
        select coalesce(
          (
            select count(*)::int
            from jsonb_each(
              coalesce(
                (us.payload -> ('school_' || p_community_id) -> 'lessons')::jsonb,
                (us.payload -> ('stats_' || p_community_id) -> 'school' -> 'lessons')::jsonb,
                '{}'::jsonb
              )
            ) kv
            where (kv.value ->> 'passed')::boolean is true
          ),
          0
        )
        from public.pt_user_state us
        where us.user_id = p.user_id
        limit 1
      ) as school_passed
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

-- Manager detalle: lookup robusto + SOLO datos de la comunidad (sin PF)
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
  school json;
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

  -- Fallback: a veces el client manda email o id legacy
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

  school := null;
  cstats := null;
  if state is not null then
    school := state -> ('school_' || cid);
    if school is null then
      school := state -> ('stats_' || cid) -> 'school';
    end if;
    cstats := state -> ('stats_' || cid);
    /* Sin fallback a PokerForge (stats / school / plan) */
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

revoke all on function public.pt_manager_list_members(text) from public;
grant execute on function public.pt_manager_list_members(text) to authenticated;
revoke all on function public.pt_manager_member_usage(text, text) from public;
grant execute on function public.pt_manager_member_usage(text, text) to authenticated;
