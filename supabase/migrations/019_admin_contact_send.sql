-- Admin: iniciar mensajes a uno, varios o todos los usuarios

create or replace function public.pt_admin_contact_send(
  p_subject text,
  p_body text,
  p_target_mode text default 'single',
  p_user_ids text[] default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  subj text := left(trim(coalesce(p_subject, '')), 200);
  body text := left(trim(coalesce(p_body, '')), 3000);
  mode_text text := lower(trim(coalesce(p_target_mode, 'single')));
  sent_count int := 0;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  if length(subj) < 3 then
    raise exception 'subject_too_short';
  end if;
  if length(body) < 5 then
    raise exception 'body_too_short';
  end if;
  if mode_text not in ('single', 'multiple', 'all') then
    raise exception 'invalid_target_mode';
  end if;

  with recipients as (
    select p.user_id, p.email, p.name
    from public.pt_user_profiles p
    where p.user_id <> uid
      and p.user_id <> 'pt_demo_user'
      and (
        mode_text = 'all'
        or p.user_id = any(coalesce(p_user_ids, array[]::text[]))
      )
  ), created_threads as (
    insert into public.pt_contact_threads (
      user_id, user_email, user_name, subject, admin_unread_count, user_unread_count, status
    )
    select r.user_id, r.email, r.name, subj, 0, 1, 'open'
    from recipients r
    returning id, user_id
  ), created_messages as (
    insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
    select t.id, 'admin', uid, body
    from created_threads t
    returning thread_id
  )
  select count(*)::int into sent_count
  from created_messages;

  if sent_count <= 0 then
    raise exception 'no_recipients';
  end if;

  return json_build_object('ok', true, 'sent_count', sent_count);
end;
$$;

revoke all on function public.pt_admin_contact_send(text, text, text, text[]) from public;
grant execute on function public.pt_admin_contact_send(text, text, text, text[]) to authenticated;
