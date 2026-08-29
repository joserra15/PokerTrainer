-- Admin gestión comunidades, welcome message, cuota IA independiente (40/mes).

alter table public.pt_communities
  add column if not exists welcome_message text;

alter table public.pt_ai_usage
  add column if not exists community_id text references public.pt_communities(id);

create index if not exists pt_ai_usage_community_month_idx
  on public.pt_ai_usage (community_id, user_id, created_at desc);

-- Cupo IA de comunidad (independiente del plan PokerForge)
create or replace function public.pt_community_ai_limit()
returns int
language sql
immutable
as $$
  select 40;
$$;

create or replace function public.pt_community_ai_usage_month_count(
  p_user_id text,
  p_community_id text
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.pt_ai_usage
  where user_id = p_user_id
    and community_id = p_community_id
    and (timezone('Europe/Madrid', created_at))::date >= public.pt_month_start_utc();
$$;

-- Uso de plan PokerForge: solo filas sin community_id (independiente de comunidades)
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
    and community_id is null
    and (timezone('Europe/Madrid', created_at))::date >= public.pt_month_start_utc();
$$;

drop function if exists public.pt_check_ai_access(text);

create or replace function public.pt_check_ai_access(
  p_user_id text,
  p_community_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  plan_lim int;
  used int;
  plan_used int;
  bonus int;
  cid text;
  c_used int;
  c_lim int;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if public.pt_profile_is_admin(prof) then
    return json_build_object('ok', true, 'source', 'admin', 'unlimited', true);
  end if;

  cid := nullif(trim(coalesce(p_community_id, '')), '');
  if cid is not null and cid <> 'pokerforge' then
    if not exists (
      select 1 from public.pt_community_members m
      where m.user_id = p_user_id
        and m.community_id = cid
        and m.status = 'active'
    ) then
      return json_build_object('ok', false, 'error', 'not_a_member');
    end if;
    c_lim := public.pt_community_ai_limit();
    c_used := public.pt_community_ai_usage_month_count(p_user_id, cid);
    if c_used < c_lim then
      return json_build_object(
        'ok', true,
        'source', 'community',
        'community_id', cid,
        'used', c_used,
        'limit', c_lim
      );
    end if;
    return json_build_object(
      'ok', false,
      'error', 'ai_limit',
      'source', 'community',
      'community_id', cid,
      'used', c_used,
      'limit', c_lim
    );
  end if;

  plan_lim := public.pt_ai_plan_limit(prof);
  used := public.pt_ai_usage_month_count(p_user_id);
  plan_used := public.pt_ai_plan_used_month_count(p_user_id);
  bonus := public.pt_bonus_effective_balance(prof);

  if plan_lim is null then
    return json_build_object('ok', true, 'source', 'plan', 'unlimited', true, 'used', used);
  end if;

  if plan_used < plan_lim then
    return json_build_object(
      'ok', true, 'source', 'plan', 'used', used, 'plan_used', plan_used,
      'limit', plan_lim, 'bonus_balance', bonus
    );
  end if;

  if bonus > 0 then
    return json_build_object(
      'ok', true, 'source', 'bonus', 'used', used, 'plan_used', plan_used,
      'limit', plan_lim, 'bonus_balance', bonus
    );
  end if;

  if plan_lim <= 0 then
    return json_build_object('ok', false, 'error', 'ai_plan', 'used', used, 'limit', plan_lim);
  end if;

  return json_build_object('ok', false, 'error', 'ai_limit', 'used', used, 'limit', plan_lim);
end;
$$;

drop function if exists public.pt_record_ai_usage(text, text, text);
create or replace function public.pt_record_ai_usage(
  p_user_id text,
  p_mode text,
  p_source text default 'plan',
  p_community_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  new_bal int;
  cid text;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  cid := nullif(trim(coalesce(p_community_id, '')), '');
  if cid = 'pokerforge' then cid := null; end if;

  if public.pt_profile_is_admin(prof) then
    insert into public.pt_ai_usage (user_id, mode, community_id)
    values (p_user_id, coalesce(p_mode, 'report'), cid);
    return json_build_object('ok', true, 'admin', true);
  end if;

  insert into public.pt_ai_usage (user_id, mode, community_id)
  values (p_user_id, coalesce(p_mode, 'report'), cid);

  -- Solo el cupo PokerForge alimenta pt_usage_monthly
  if cid is null then
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
  end if;

  return json_build_object('ok', true, 'community_id', cid);
end;
$$;

revoke all on function public.pt_record_ai_usage(text, text, text, text) from public;
grant execute on function public.pt_record_ai_usage(text, text, text, text) to authenticated;
grant execute on function public.pt_record_ai_usage(text, text, text, text) to service_role;

revoke all on function public.pt_check_ai_access(text, text) from public;
grant execute on function public.pt_check_ai_access(text, text) to authenticated;
grant execute on function public.pt_check_ai_access(text, text) to service_role;

-- Bienvenida legible por miembros (y managers)
create or replace function public.pt_get_community_welcome(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.pt_communities;
begin
  if p_community_id is null or trim(p_community_id) = '' or p_community_id = 'pokerforge' then
    return json_build_object('ok', true, 'welcome_message', null);
  end if;
  if not (
    public.is_pt_admin()
    or public.pt_is_community_member(p_community_id)
  ) then
    raise exception 'forbidden';
  end if;
  select * into c from public.pt_communities where id = p_community_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  return json_build_object(
    'ok', true,
    'community_id', c.id,
    'welcome_message', c.welcome_message,
    'name', c.name
  );
end;
$$;

revoke all on function public.pt_get_community_welcome(text) from public;
grant execute on function public.pt_get_community_welcome(text) to authenticated;

create or replace function public.pt_my_community_ai_status(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  used int;
  lim int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_community_id is null or trim(p_community_id) = '' or p_community_id = 'pokerforge' then
    return json_build_object('ok', false, 'error', 'invalid_community');
  end if;
  if not public.pt_is_community_member(p_community_id) and not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  lim := public.pt_community_ai_limit();
  used := public.pt_community_ai_usage_month_count(uid, p_community_id);
  return json_build_object(
    'ok', true,
    'community_id', p_community_id,
    'used', used,
    'limit', lim,
    'left', greatest(0, lim - used)
  );
end;
$$;

revoke all on function public.pt_my_community_ai_status(text) from public;
grant execute on function public.pt_my_community_ai_status(text) to authenticated;

-- ─── Admin: listado enriquecido ──────────────────────────────────────────────

create or replace function public.pt_admin_list_communities()
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

  select coalesce(json_agg(row_to_json(x) order by x.id), '[]'::json)
  into rows
  from (
    select
      c.id,
      c.name,
      c.entry_path,
      c.active,
      c.join_code,
      c.welcome_message,
      c.created_at,
      (select count(*)::int
         from public.pt_community_members m
        where m.community_id = c.id and m.status = 'active') as member_count,
      (select count(*)::int
         from public.pt_community_members m
        where m.community_id = c.id and m.status = 'active' and m.role = 'manager') as manager_count
    from public.pt_communities c
  ) x;

  return json_build_object('ok', true, 'communities', rows);
end;
$$;

revoke all on function public.pt_admin_list_communities() from public;
grant execute on function public.pt_admin_list_communities() to authenticated;

create or replace function public.pt_admin_update_community(
  p_community_id text,
  p_join_code text default null,
  p_welcome_message text default null,
  p_name text default null,
  p_active boolean default null,
  p_entry_path text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.pt_communities;
  code text;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select * into c from public.pt_communities where id = p_community_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  code := case
    when p_join_code is null then c.join_code
    when trim(p_join_code) = '' then null
    else upper(trim(p_join_code))
  end;

  update public.pt_communities
  set
    join_code = code,
    welcome_message = case
      when p_welcome_message is null then welcome_message
      else nullif(trim(p_welcome_message), '')
    end,
    name = case when p_name is null or trim(p_name) = '' then name else trim(p_name) end,
    active = coalesce(p_active, active),
    entry_path = case
      when p_entry_path is null or trim(p_entry_path) = '' then entry_path
      else trim(p_entry_path)
    end
  where id = p_community_id
  returning * into c;

  return json_build_object(
    'ok', true,
    'community', json_build_object(
      'id', c.id,
      'name', c.name,
      'entry_path', c.entry_path,
      'active', c.active,
      'join_code', c.join_code,
      'welcome_message', c.welcome_message
    )
  );
end;
$$;

revoke all on function public.pt_admin_update_community(text, text, text, text, boolean, text) from public;
grant execute on function public.pt_admin_update_community(text, text, text, text, boolean, text) to authenticated;

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
          (us.payload -> 'stats' -> 'school' ->> 'xp')::int,
          (us.payload -> 'school' ->> 'xp')::int,
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
                (us.payload -> 'stats' -> 'school' -> 'lessons')::jsonb,
                (us.payload -> 'school' -> 'lessons')::jsonb,
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

revoke all on function public.pt_admin_community_detail(text) from public;
grant execute on function public.pt_admin_community_detail(text) to authenticated;

-- ─── Manager: settings + listado enriquecido ─────────────────────────────────

create or replace function public.pt_manager_get_settings(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.pt_communities;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;
  select * into c from public.pt_communities where id = p_community_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  return json_build_object(
    'ok', true,
    'community_id', c.id,
    'name', c.name,
    'entry_path', c.entry_path,
    'join_code', c.join_code,
    'welcome_message', c.welcome_message,
    'login_url', 'https://www.pokerforgeai.com' || coalesce(nullif(c.entry_path, ''), '/?app=' || c.id),
    'ai_limit', public.pt_community_ai_limit()
  );
end;
$$;

revoke all on function public.pt_manager_get_settings(text) from public;
grant execute on function public.pt_manager_get_settings(text) to authenticated;

create or replace function public.pt_manager_set_welcome(
  p_community_id text,
  p_welcome_message text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.pt_communities;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;
  update public.pt_communities
  set welcome_message = nullif(trim(coalesce(p_welcome_message, '')), '')
  where id = p_community_id
  returning * into c;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  return json_build_object('ok', true, 'welcome_message', c.welcome_message);
end;
$$;

revoke all on function public.pt_manager_set_welcome(text, text) from public;
grant execute on function public.pt_manager_set_welcome(text, text) to authenticated;

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
          (us.payload -> 'stats' -> 'school' ->> 'xp')::int,
          (us.payload -> 'school' ->> 'xp')::int,
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
                (us.payload -> 'stats' -> 'school' -> 'lessons')::jsonb,
                (us.payload -> 'school' -> 'lessons')::jsonb,
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
      school := state -> 'stats' -> 'school';
    end if;
    if school is null then
      school := state -> 'school';
    end if;
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
