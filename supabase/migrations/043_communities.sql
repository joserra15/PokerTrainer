-- Multi-comunidad: memberships, roles manager, contacto scoped, preferencia default_app.

create table if not exists public.pt_communities (
  id text primary key,
  name text not null,
  entry_path text not null default '/',
  active boolean not null default true,
  join_code text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pt_community_members (
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  community_id text not null references public.pt_communities(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'manager')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default timezone('utc', now()),
  granted_by text,
  revoked_at timestamptz,
  primary key (user_id, community_id)
);

create index if not exists pt_community_members_community_idx
  on public.pt_community_members (community_id, status, role);

create index if not exists pt_community_members_user_idx
  on public.pt_community_members (user_id, status);

alter table public.pt_communities enable row level security;
alter table public.pt_community_members enable row level security;

alter table public.pt_user_profiles
  add column if not exists default_app text not null default 'pokerforge';

alter table public.pt_contact_threads
  add column if not exists community_id text references public.pt_communities(id);

create index if not exists pt_contact_threads_community_idx
  on public.pt_contact_threads (community_id, last_message_at desc);

-- Permitir sender_role manager en mensajes
alter table public.pt_contact_messages drop constraint if exists pt_contact_messages_sender_role_check;
alter table public.pt_contact_messages
  add constraint pt_contact_messages_sender_role_check
  check (sender_role in ('user', 'admin', 'manager'));

insert into public.pt_communities (id, name, entry_path, active, join_code)
values ('mttlab', 'MTT LAB', '/mttlab/', true, 'MTTLAB26')
on conflict (id) do update set
  name = excluded.name,
  entry_path = excluded.entry_path,
  active = excluded.active,
  join_code = coalesce(public.pt_communities.join_code, excluded.join_code);

-- ─── Helpers de acceso ───────────────────────────────────────────────────────

create or replace function public.pt_is_community_member(p_community_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_pt_admin()
    or exists (
      select 1
      from public.pt_community_members m
      where m.user_id = auth.uid()::text
        and m.community_id = p_community_id
        and m.status = 'active'
    );
$$;

create or replace function public.pt_is_community_manager(p_community_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_pt_admin()
    or exists (
      select 1
      from public.pt_community_members m
      where m.user_id = auth.uid()::text
        and m.community_id = p_community_id
        and m.status = 'active'
        and m.role = 'manager'
    );
$$;

create or replace function public.pt_assert_community_access(p_community_id text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_community_id is null or p_community_id = '' or p_community_id = 'pokerforge' then
    return;
  end if;
  if not public.pt_is_community_member(p_community_id) then
    raise exception 'forbidden';
  end if;
end;
$$;

revoke all on function public.pt_is_community_member(text) from public;
grant execute on function public.pt_is_community_member(text) to authenticated;
revoke all on function public.pt_is_community_manager(text) from public;
grant execute on function public.pt_is_community_manager(text) to authenticated;
revoke all on function public.pt_assert_community_access(text) from public;
grant execute on function public.pt_assert_community_access(text) to authenticated;

-- Lista de comunidades del usuario (+ pokerforge siempre)
create or replace function public.pt_my_communities()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prof public.pt_user_profiles;
  rows json;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid;

  select coalesce(json_agg(row_to_json(x) order by x.sort_ord), '[]'::json)
  into rows
  from (
    select
      'pokerforge'::text as id,
      'PokerForgeAI'::text as name,
      '/'::text as entry_path,
      'member'::text as role,
      true as active,
      0 as sort_ord
    union all
    select
      c.id,
      c.name,
      c.entry_path,
      m.role,
      c.active,
      1 as sort_ord
    from public.pt_community_members m
    join public.pt_communities c on c.id = m.community_id
    where m.user_id = uid
      and m.status = 'active'
      and c.active = true
  ) x;

  return json_build_object(
    'ok', true,
    'communities', rows,
    'default_app', coalesce(prof.default_app, 'pokerforge'),
    'is_admin', coalesce(prof.is_admin, false)
  );
end;
$$;

revoke all on function public.pt_my_communities() from public;
grant execute on function public.pt_my_communities() to authenticated;

create or replace function public.pt_set_default_app(p_app text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  app text := lower(trim(coalesce(p_app, 'pokerforge')));
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if app = '' then app := 'pokerforge'; end if;

  if app <> 'pokerforge' then
    perform public.pt_assert_community_access(app);
  end if;

  update public.pt_user_profiles
  set default_app = app
  where user_id = uid;

  return json_build_object('ok', true, 'default_app', app);
end;
$$;

revoke all on function public.pt_set_default_app(text) from public;
grant execute on function public.pt_set_default_app(text) to authenticated;

-- Unirse con código de comunidad
create or replace function public.pt_join_community(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  code text := upper(trim(coalesce(p_code, '')));
  c public.pt_communities;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select * into c
  from public.pt_communities
  where active = true
    and upper(trim(coalesce(join_code, ''))) = code
  limit 1;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into public.pt_community_members (user_id, community_id, role, status, granted_by)
  values (uid, c.id, 'member', 'active', 'join_code')
  on conflict (user_id, community_id) do update set
    status = 'active',
    revoked_at = null,
    granted_at = timezone('utc', now()),
    granted_by = 'join_code',
    role = case
      when public.pt_community_members.role = 'manager' then 'manager'
      else 'member'
    end;

  return json_build_object('ok', true, 'community_id', c.id, 'name', c.name);
end;
$$;

revoke all on function public.pt_join_community(text) from public;
grant execute on function public.pt_join_community(text) to authenticated;

-- Admin: grant / revoke / set manager
create or replace function public.pt_admin_set_community_member(
  p_user_id text,
  p_community_id text,
  p_role text default 'member',
  p_status text default 'active'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  role_v text := lower(trim(coalesce(p_role, 'member')));
  status_v text := lower(trim(coalesce(p_status, 'active')));
  admin_uid text := auth.uid()::text;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  if p_user_id is null or p_user_id = '' then
    raise exception 'missing_user';
  end if;
  if not exists (select 1 from public.pt_communities where id = p_community_id and active) then
    raise exception 'unknown_community';
  end if;
  if role_v not in ('member', 'manager') then
    raise exception 'invalid_role';
  end if;
  if status_v not in ('active', 'revoked') then
    raise exception 'invalid_status';
  end if;

  insert into public.pt_community_members (
    user_id, community_id, role, status, granted_by, revoked_at
  ) values (
    p_user_id,
    p_community_id,
    role_v,
    status_v,
    admin_uid,
    case when status_v = 'revoked' then timezone('utc', now()) else null end
  )
  on conflict (user_id, community_id) do update set
    role = excluded.role,
    status = excluded.status,
    granted_by = admin_uid,
    granted_at = case
      when excluded.status = 'active' then timezone('utc', now())
      else public.pt_community_members.granted_at
    end,
    revoked_at = case
      when excluded.status = 'revoked' then timezone('utc', now())
      else null
    end;

  return json_build_object(
    'ok', true,
    'user_id', p_user_id,
    'community_id', p_community_id,
    'role', role_v,
    'status', status_v
  );
end;
$$;

revoke all on function public.pt_admin_set_community_member(text, text, text, text) from public;
grant execute on function public.pt_admin_set_community_member(text, text, text, text) to authenticated;

create or replace function public.pt_admin_list_communities()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  return (
    select coalesce(json_agg(row_to_json(c) order by c.id), '[]'::json)
    from public.pt_communities c
    where c.active = true
  );
end;
$$;

revoke all on function public.pt_admin_list_communities() from public;
grant execute on function public.pt_admin_list_communities() to authenticated;

-- Ampliar lista admin con memberships (json)
drop function if exists public.pt_admin_user_list();

create function public.pt_admin_user_list()
returns table (
  user_id text,
  email text,
  name text,
  plan text,
  is_admin boolean,
  is_founder boolean,
  is_founder_study boolean,
  is_founder_coach boolean,
  founder_requested_at timestamptz,
  founder_study_requested_at timestamptz,
  founder_coach_requested_at timestamptz,
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
  stripe_last_payment_at timestamptz,
  push_enabled boolean,
  push_devices int,
  default_app text,
  communities json
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
    (coalesce(p.is_founder_study, false) or coalesce(p.is_founder_coach, false) or coalesce(p.is_founder, false)) as is_founder,
    coalesce(p.is_founder_study, false) as is_founder_study,
    coalesce(p.is_founder_coach, false) as is_founder_coach,
    p.founder_requested_at,
    p.founder_study_requested_at,
    p.founder_coach_requested_at,
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
    p.stripe_last_payment_at,
    (coalesce(psub.devices, 0) > 0) as push_enabled,
    coalesce(psub.devices, 0) as push_devices,
    coalesce(p.default_app, 'pokerforge') as default_app,
    coalesce(cm.communities, '[]'::json) as communities
  from public.pt_user_profiles p
  left join lateral (
    select count(*)::bigint as cnt
    from public.pt_ai_usage a
    where a.user_id = p.user_id
      and a.created_at >= public.pt_month_start_utc()
  ) u on true
  left join lateral (
    select count(*)::int as devices
    from public.pt_push_subscriptions s
    where s.user_id = p.user_id
      and s.enabled = true
  ) psub on true
  left join lateral (
    select json_agg(json_build_object(
      'community_id', m.community_id,
      'role', m.role,
      'status', m.status
    ) order by m.community_id) as communities
    from public.pt_community_members m
    where m.user_id = p.user_id
      and m.status = 'active'
  ) cm on true
  order by p.last_seen_at desc nulls last, p.created_at desc;
end;
$$;

revoke all on function public.pt_admin_user_list() from public;
grant execute on function public.pt_admin_user_list() to authenticated;

-- Contacto: create thread con community_id opcional
create or replace function public.pt_contact_create_thread(
  p_subject text,
  p_body text,
  p_community_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  subj text;
  body text;
  tid uuid;
  prof record;
  cid text := nullif(trim(coalesce(p_community_id, '')), '');
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  subj := left(trim(coalesce(p_subject, '')), 200);
  body := left(trim(coalesce(p_body, '')), 3000);
  if length(subj) < 3 then raise exception 'subject_too_short'; end if;
  if length(body) < 5 then raise exception 'body_too_short'; end if;

  if cid is not null and cid <> 'pokerforge' then
    perform public.pt_assert_community_access(cid);
  else
    cid := null;
  end if;

  select email, name into prof from public.pt_user_profiles where user_id = uid;

  insert into public.pt_contact_threads (
    user_id, user_email, user_name, subject, admin_unread_count, user_unread_count, community_id
  ) values (
    uid, prof.email, prof.name, subj, 1, 0, cid
  ) returning id into tid;

  insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
  values (tid, 'user', uid, body);

  return json_build_object('ok', true, 'thread_id', tid, 'community_id', cid);
end;
$$;

revoke all on function public.pt_contact_create_thread(text, text, text) from public;
grant execute on function public.pt_contact_create_thread(text, text, text) to authenticated;
-- Compat: overload 2-arg sigue existiendo vía default en Postgres solo si se redefine;
-- mantenemos grant del signature con 2 args llamando al de 3 con null vía wrapper.
create or replace function public.pt_contact_create_thread(p_subject text, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.pt_contact_create_thread(p_subject, p_body, null);
end;
$$;

revoke all on function public.pt_contact_create_thread(text, text) from public;
grant execute on function public.pt_contact_create_thread(text, text) to authenticated;

-- Manager: listar miembros (sin pagos)
create or replace function public.pt_manager_list_members(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rows json;
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
      p.created_at
    from public.pt_community_members m
    join public.pt_user_profiles p on p.user_id = m.user_id
    where m.community_id = p_community_id
      and m.status = 'active'
  ) x;

  return json_build_object('ok', true, 'community_id', p_community_id, 'members', rows);
end;
$$;

revoke all on function public.pt_manager_list_members(text) from public;
grant execute on function public.pt_manager_list_members(text) to authenticated;

-- Manager: detalle uso/avance escuela (sin pagos / stripe)
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
      school := state -> 'school';
    end if;
  end if;

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
      'created_at', prof.created_at
    ),
    'school', school
  );
end;
$$;

revoke all on function public.pt_manager_member_usage(text, text) from public;
grant execute on function public.pt_manager_member_usage(text, text) to authenticated;

-- Manager: listar hilos de su comunidad
create or replace function public.pt_manager_contact_threads(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rows json;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.last_message_at desc), '[]'::json)
  into rows
  from public.pt_contact_threads t
  where t.community_id = p_community_id;

  return json_build_object('ok', true, 'threads', rows);
end;
$$;

revoke all on function public.pt_manager_contact_threads(text) from public;
grant execute on function public.pt_manager_contact_threads(text) to authenticated;

create or replace function public.pt_manager_contact_reply(
  p_community_id text,
  p_thread_id uuid,
  p_body text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  body text;
  th public.pt_contact_threads;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;
  body := left(trim(coalesce(p_body, '')), 3000);
  if length(body) < 1 then raise exception 'body_empty'; end if;

  select * into th from public.pt_contact_threads where id = p_thread_id;
  if not found or th.community_id is distinct from p_community_id then
    raise exception 'forbidden';
  end if;

  insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
  values (p_thread_id, 'manager', uid, body);

  update public.pt_contact_threads
  set
    user_unread_count = user_unread_count + 1,
    last_message_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_thread_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_manager_contact_reply(text, uuid, text) from public;
grant execute on function public.pt_manager_contact_reply(text, uuid, text) to authenticated;

create or replace function public.pt_manager_contact_get_thread(
  p_community_id text,
  p_thread_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  th public.pt_contact_threads;
  msgs json;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;

  select * into th from public.pt_contact_threads where id = p_thread_id;
  if not found or th.community_id is distinct from p_community_id then
    raise exception 'forbidden';
  end if;

  update public.pt_contact_threads
  set admin_unread_count = 0, updated_at = timezone('utc', now())
  where id = p_thread_id;

  select coalesce(json_agg(row_to_json(m) order by m.created_at asc), '[]'::json)
  into msgs
  from public.pt_contact_messages m
  where m.thread_id = p_thread_id;

  return json_build_object('ok', true, 'thread', row_to_json(th), 'messages', msgs);
end;
$$;

revoke all on function public.pt_manager_contact_get_thread(text, uuid) from public;
grant execute on function public.pt_manager_contact_get_thread(text, uuid) to authenticated;

-- Gate genérico para features de comunidad (llamable desde cliente)
create or replace function public.pt_community_feature_access(
  p_community_id text,
  p_feature text default 'shell'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cid text := nullif(trim(coalesce(p_community_id, '')), '');
  feat text := lower(trim(coalesce(p_feature, 'shell')));
  allowed boolean := false;
  is_mgr boolean := false;
begin
  if cid is null or cid = '' or cid = 'pokerforge' then
    return json_build_object(
      'ok', true,
      'allowed', true,
      'community_id', 'pokerforge',
      'feature', feat,
      'is_manager', false
    );
  end if;

  allowed := public.pt_is_community_member(cid);
  is_mgr := public.pt_is_community_manager(cid);

  if feat = 'manager' then
    allowed := is_mgr;
  end if;

  if not allowed then
    return json_build_object(
      'ok', false,
      'allowed', false,
      'error', 'forbidden',
      'community_id', cid,
      'feature', feat
    );
  end if;

  return json_build_object(
    'ok', true,
    'allowed', true,
    'community_id', cid,
    'feature', feat,
    'is_manager', is_mgr
  );
end;
$$;

revoke all on function public.pt_community_feature_access(text, text) from public;
grant execute on function public.pt_community_feature_access(text, text) to authenticated;
