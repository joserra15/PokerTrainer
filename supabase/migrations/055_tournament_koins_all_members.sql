-- 055: Clasificación de comunidad — todos los miembros con sus Koins actuales.
-- Incluye miembros activos aún sin fila de koins (saldo 0) y filas de koins existentes.
-- Ya no se filtra por tournaments_played >= 1.

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

  select coalesce(json_agg(row_to_json(x) order by x.koins desc, x.display_name asc), '[]'::json)
  into rows
  from (
    select
      k.user_id,
      coalesce(
        nullif(trim(p.tournament_alias), ''),
        nullif(trim(k.display_name), ''),
        nullif(trim(p.name), ''),
        'Jugador'
      ) as display_name,
      k.koins,
      coalesce(k.tournaments_played, 0) as tournaments_played,
      k.updated_at
    from public.pt_community_tournament_koins k
    left join public.pt_user_profiles p on p.user_id = k.user_id
    where k.community_id = cid

    union all

    /* Miembros activos aún sin fila de koins (saldo inicial 0). */
    select
      m.user_id,
      coalesce(
        nullif(trim(p.tournament_alias), ''),
        nullif(trim(p.name), ''),
        'Jugador'
      ) as display_name,
      0::numeric as koins,
      0 as tournaments_played,
      coalesce(m.granted_at, now()) as updated_at
    from public.pt_community_members m
    left join public.pt_user_profiles p on p.user_id = m.user_id
    left join public.pt_community_tournament_koins k
      on k.community_id = m.community_id and k.user_id = m.user_id
    where m.community_id = cid
      and m.status = 'active'
      and k.user_id is null
  ) x;

  return json_build_object('ok', true, 'community_id', cid, 'members', rows);
end;
$$;

revoke all on function public.pt_list_community_tournament_koins(text) from public;
grant execute on function public.pt_list_community_tournament_koins(text) to authenticated;
