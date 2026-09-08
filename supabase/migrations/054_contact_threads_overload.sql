-- Fix: PostgREST/Postgres no puede elegir entre
--   pt_contact_my_threads()  y  pt_contact_my_threads(p_community_id text default null)
-- cuando el cliente llama sin args (PokerForge). Mismo problema en unread_count.
-- Solución: una sola signature con p_community_id (null = PokerForge).

drop function if exists public.pt_contact_my_threads();
drop function if exists public.pt_contact_unread_count();

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
