-- Mensajes de contacto usuario ↔ administrador

create table if not exists public.pt_contact_threads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_email text,
  user_name text,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  admin_unread_count int not null default 0,
  user_unread_count int not null default 0,
  last_message_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pt_contact_threads_user_idx
  on public.pt_contact_threads (user_id, last_message_at desc);

create index if not exists pt_contact_threads_admin_unread_idx
  on public.pt_contact_threads (admin_unread_count desc, last_message_at desc)
  where admin_unread_count > 0;

create table if not exists public.pt_contact_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.pt_contact_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  sender_id text,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pt_contact_messages_thread_idx
  on public.pt_contact_messages (thread_id, created_at asc);

alter table public.pt_contact_threads enable row level security;
alter table public.pt_contact_messages enable row level security;

drop policy if exists "contact_threads_select_own" on public.pt_contact_threads;
create policy "contact_threads_select_own"
on public.pt_contact_threads for select to authenticated
using (
  user_id = auth.uid()::text
  or public.is_pt_admin()
);

drop policy if exists "contact_messages_select" on public.pt_contact_messages;
create policy "contact_messages_select"
on public.pt_contact_messages for select to authenticated
using (
  exists (
    select 1 from public.pt_contact_threads t
    where t.id = thread_id
      and (t.user_id = auth.uid()::text or public.is_pt_admin())
  )
);

-- Crear hilo + primer mensaje (usuario)
create or replace function public.pt_contact_create_thread(
  p_subject text,
  p_body text
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
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  subj := left(trim(coalesce(p_subject, '')), 200);
  body := left(trim(coalesce(p_body, '')), 3000);
  if length(subj) < 3 then raise exception 'subject_too_short'; end if;
  if length(body) < 5 then raise exception 'body_too_short'; end if;

  select email, name into prof from public.pt_user_profiles where user_id = uid;

  insert into public.pt_contact_threads (
    user_id, user_email, user_name, subject, admin_unread_count, user_unread_count
  ) values (
    uid, prof.email, prof.name, subj, 1, 0
  ) returning id into tid;

  insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
  values (tid, 'user', uid, body);

  return json_build_object('ok', true, 'thread_id', tid);
end;
$$;

revoke all on function public.pt_contact_create_thread(text, text) from public;
grant execute on function public.pt_contact_create_thread(text, text) to authenticated;

-- Responder en hilo existente (usuario)
create or replace function public.pt_contact_user_reply(
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
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  body := left(trim(coalesce(p_body, '')), 3000);
  if length(body) < 1 then raise exception 'body_empty'; end if;

  if not exists (
    select 1 from public.pt_contact_threads
    where id = p_thread_id and user_id = uid and status = 'open'
  ) then
    raise exception 'thread_not_found';
  end if;

  insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
  values (p_thread_id, 'user', uid, body);

  update public.pt_contact_threads
  set admin_unread_count = admin_unread_count + 1,
      user_unread_count = 0,
      last_message_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_thread_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_contact_user_reply(uuid, text) from public;
grant execute on function public.pt_contact_user_reply(uuid, text) to authenticated;

-- Listar hilos del usuario
create or replace function public.pt_contact_my_threads()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  return coalesce((
    select json_agg(row_to_json(x) order by x.last_message_at desc)
    from (
      select id, subject, status, user_unread_count, admin_unread_count,
             last_message_at, created_at
      from public.pt_contact_threads
      where user_id = uid
      order by last_message_at desc
      limit 50
    ) x
  ), '[]'::json);
end;
$$;

revoke all on function public.pt_contact_my_threads() from public;
grant execute on function public.pt_contact_my_threads() to authenticated;

-- Mensajes de un hilo (usuario)
create or replace function public.pt_contact_get_thread(p_thread_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  th record;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into th from public.pt_contact_threads where id = p_thread_id;
  if not found or th.user_id <> uid then
    raise exception 'thread_not_found';
  end if;

  update public.pt_contact_threads
  set user_unread_count = 0, updated_at = timezone('utc', now())
  where id = p_thread_id and user_unread_count > 0;

  return json_build_object(
    'thread', json_build_object(
      'id', th.id,
      'subject', th.subject,
      'status', th.status,
      'user_unread_count', 0,
      'last_message_at', th.last_message_at,
      'created_at', th.created_at
    ),
    'messages', coalesce((
      select json_agg(row_to_json(m) order by m.created_at asc)
      from (
        select id, sender_role, body, created_at
        from public.pt_contact_messages
        where thread_id = p_thread_id
        order by created_at asc
      ) m
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.pt_contact_get_thread(uuid) from public;
grant execute on function public.pt_contact_get_thread(uuid) to authenticated;

create or replace function public.pt_contact_unread_count()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  n int;
begin
  if uid is null then return 0; end if;
  select coalesce(sum(user_unread_count), 0)::int into n
  from public.pt_contact_threads
  where user_id = uid;
  return n;
end;
$$;

revoke all on function public.pt_contact_unread_count() from public;
grant execute on function public.pt_contact_unread_count() to authenticated;

-- Admin: listar hilos
create or replace function public.pt_admin_contact_threads()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_pt_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(row_to_json(x) order by x.admin_unread_count desc, x.last_message_at desc)
    from (
      select id, user_id, user_email, user_name, subject, status,
             admin_unread_count, user_unread_count, last_message_at, created_at
      from public.pt_contact_threads
      order by admin_unread_count desc, last_message_at desc
      limit 200
    ) x
  ), '[]'::json);
end;
$$;

revoke all on function public.pt_admin_contact_threads() from public;
grant execute on function public.pt_admin_contact_threads() to authenticated;

create or replace function public.pt_admin_contact_get_thread(p_thread_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  th record;
begin
  if not public.is_pt_admin() then raise exception 'forbidden'; end if;

  select * into th from public.pt_contact_threads where id = p_thread_id;
  if not found then raise exception 'thread_not_found'; end if;

  update public.pt_contact_threads
  set admin_unread_count = 0, updated_at = timezone('utc', now())
  where id = p_thread_id and admin_unread_count > 0;

  return json_build_object(
    'thread', json_build_object(
      'id', th.id,
      'user_id', th.user_id,
      'user_email', th.user_email,
      'user_name', th.user_name,
      'subject', th.subject,
      'status', th.status,
      'admin_unread_count', 0,
      'last_message_at', th.last_message_at,
      'created_at', th.created_at
    ),
    'messages', coalesce((
      select json_agg(row_to_json(m) order by m.created_at asc)
      from (
        select id, sender_role, body, created_at
        from public.pt_contact_messages
        where thread_id = p_thread_id
        order by created_at asc
      ) m
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.pt_admin_contact_get_thread(uuid) from public;
grant execute on function public.pt_admin_contact_get_thread(uuid) to authenticated;

create or replace function public.pt_admin_contact_reply(
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
begin
  if not public.is_pt_admin() then raise exception 'forbidden'; end if;
  body := left(trim(coalesce(p_body, '')), 3000);
  if length(body) < 1 then raise exception 'body_empty'; end if;

  if not exists (select 1 from public.pt_contact_threads where id = p_thread_id) then
    raise exception 'thread_not_found';
  end if;

  insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
  values (p_thread_id, 'admin', uid, body);

  update public.pt_contact_threads
  set user_unread_count = user_unread_count + 1,
      admin_unread_count = 0,
      last_message_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_thread_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_admin_contact_reply(uuid, text) from public;
grant execute on function public.pt_admin_contact_reply(uuid, text) to authenticated;

create or replace function public.pt_admin_contact_unread_count()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_pt_admin() then return 0; end if;
  select coalesce(sum(admin_unread_count), 0)::int into n
  from public.pt_contact_threads;
  return n;
end;
$$;

revoke all on function public.pt_admin_contact_unread_count() from public;
grant execute on function public.pt_admin_contact_unread_count() to authenticated;
