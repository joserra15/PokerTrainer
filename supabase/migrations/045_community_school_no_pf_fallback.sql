-- Manager/admin: progreso escuela solo de la comunidad (stats_<id>/school_<id>), sin fallback PokerForge.

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
  ai_used int;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;

  select * into mem
  from public.pt_community_members
  where user_id = p_user_id
    and community_id = p_community_id
    and status = 'active';
  if not found then
    raise exception 'not_a_member';
  end if;

  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  select payload into state
  from public.pt_user_state
  where user_id = p_user_id
  limit 1;

  school := null;
  if state is not null then
    school := state -> ('school_' || p_community_id);
    if school is null then
      school := state -> ('stats_' || p_community_id) -> 'school';
    end if;
    /* Sin fallback a stats.school de PokerForge */
  end if;

  ai_used := public.pt_community_ai_usage_month_count(p_user_id, p_community_id);

  return json_build_object(
    'ok', true,
    'community_id', p_community_id,
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
    'ai', json_build_object(
      'used', ai_used,
      'limit', public.pt_community_ai_limit(),
      'left', greatest(0, public.pt_community_ai_limit() - ai_used)
    )
  );
end;
$$;

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
