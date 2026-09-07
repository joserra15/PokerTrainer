-- Ranking de Koins por comunidad: solo jugadores con ≥1 torneo jugado.
-- Koins ya son independientes por (community_id, user_id); se añade tournaments_played.

alter table public.pt_community_tournament_koins
  add column if not exists tournaments_played integer not null default 0;

/* Sustituye la firma anterior (3 args) por una con tournaments_played opcional. */
drop function if exists public.pt_upsert_my_tournament_koins(text, numeric, text);

create or replace function public.pt_upsert_my_tournament_koins(
  p_community_id text,
  p_koins numeric,
  p_display_name text default null,
  p_tournaments_played integer default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  cid text := lower(trim(coalesce(p_community_id, 'pokerforge')));
  bal numeric := greatest(0, coalesce(p_koins, 0));
  played integer := greatest(0, coalesce(p_tournaments_played, 0));
  uname text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if cid <> 'pokerforge' then
    if not exists (
      select 1 from public.pt_community_members m
      where m.community_id = cid and m.user_id = uid and m.status = 'active'
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  select coalesce(nullif(trim(p_display_name), ''), nullif(trim(p.name), ''), p.email, 'Jugador')
    into uname
  from public.pt_user_profiles p
  where p.user_id = uid;

  if uname is null then
    uname := coalesce(nullif(trim(p_display_name), ''), 'Jugador');
  end if;

  insert into public.pt_community_tournament_koins as t
    (community_id, user_id, display_name, koins, tournaments_played, updated_at)
  values (cid, uid, uname, bal, played, now())
  on conflict (community_id, user_id) do update
    set koins = excluded.koins,
        display_name = excluded.display_name,
        tournaments_played = case
          when p_tournaments_played is null then t.tournaments_played
          else greatest(t.tournaments_played, excluded.tournaments_played)
        end,
        updated_at = now();

  return json_build_object(
    'ok', true,
    'community_id', cid,
    'koins', bal,
    'tournaments_played', (
      select tournaments_played from public.pt_community_tournament_koins
      where community_id = cid and user_id = uid
    ),
    'display_name', uname
  );
end;
$$;

revoke all on function public.pt_upsert_my_tournament_koins(text, numeric, text, integer) from public;
grant execute on function public.pt_upsert_my_tournament_koins(text, numeric, text, integer) to authenticated;

create or replace function public.pt_list_community_tournament_koins(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  cid text := lower(trim(coalesce(p_community_id, 'pokerforge')));
  rows json;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if cid <> 'pokerforge' then
    if not exists (
      select 1 from public.pt_community_members m
      where m.community_id = cid and m.user_id = uid and m.status = 'active'
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  /* Solo jugadores con ≥1 torneo en esta comunidad (sin sintetizar todos los miembros). */
  select coalesce(json_agg(row_to_json(x) order by x.koins desc, x.display_name asc), '[]'::json)
  into rows
  from (
    select
      k.user_id,
      coalesce(nullif(trim(k.display_name), ''), nullif(trim(p.name), ''), 'Jugador') as display_name,
      k.koins,
      k.tournaments_played,
      k.updated_at
    from public.pt_community_tournament_koins k
    left join public.pt_user_profiles p on p.user_id = k.user_id
    where k.community_id = cid
      and k.tournaments_played >= 1
  ) x;

  return json_build_object('ok', true, 'community_id', cid, 'members', rows);
end;
$$;

revoke all on function public.pt_list_community_tournament_koins(text) from public;
grant execute on function public.pt_list_community_tournament_koins(text) to authenticated;
