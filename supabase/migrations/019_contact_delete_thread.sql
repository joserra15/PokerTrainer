-- Borrar conversación de contacto (usuario propietario)

create or replace function public.pt_contact_delete_thread(p_thread_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_thread_id is null then raise exception 'invalid_thread'; end if;

  delete from public.pt_contact_threads
  where id = p_thread_id and user_id = uid;

  if not found then raise exception 'thread_not_found'; end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_contact_delete_thread(uuid) from public;
grant execute on function public.pt_contact_delete_thread(uuid) to authenticated;
