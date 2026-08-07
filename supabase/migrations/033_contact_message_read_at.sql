-- Estado de lectura por mensaje (admin → usuario): read_at en pt_contact_messages.

alter table public.pt_contact_messages
  add column if not exists read_at timestamptz;

create index if not exists pt_contact_messages_unread_admin_idx
  on public.pt_contact_messages (thread_id, created_at)
  where sender_role = 'admin' and read_at is null;

-- Backfill aproximado: si el hilo no tiene pendientes para el usuario, marcar mensajes admin como leídos.
update public.pt_contact_messages m
set read_at = coalesce(t.updated_at, t.last_message_at, timezone('utc', now()))
from public.pt_contact_threads t
where m.thread_id = t.id
  and m.sender_role = 'admin'
  and m.read_at is null
  and coalesce(t.user_unread_count, 0) = 0;

-- Usuario abre el hilo: marca mensajes de admin como leídos + resetea contador.
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

  update public.pt_contact_messages
  set read_at = timezone('utc', now())
  where thread_id = p_thread_id
    and sender_role = 'admin'
    and read_at is null;

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
        select id, sender_role, body, created_at, read_at
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

-- Admin: devolver read_at y user_unread_count del hilo.
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
      'user_unread_count', th.user_unread_count,
      'last_message_at', th.last_message_at,
      'created_at', th.created_at
    ),
    'messages', coalesce((
      select json_agg(row_to_json(m) order by m.created_at asc)
      from (
        select id, sender_role, body, created_at, read_at
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
