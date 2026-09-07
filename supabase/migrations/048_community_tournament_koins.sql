-- Community tournament Koins leaderboard (real members only).
-- Members of a community can read the board; each user upserts only their own row.

create table if not exists public.pt_community_tournament_koins (
  community_id text not null,
  user_id text not null,
  display_name text,
  koins numeric not null default 100,
  updated_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists pt_community_tournament_koins_community_idx
  on public.pt_community_tournament_koins (community_id, koins desc);

alter table public.pt_community_tournament_koins enable row level security;

drop policy if exists "ctk_select_member" on public.pt_community_tournament_koins;
create policy "ctk_select_member"
  on public.pt_community_tournament_koins for select to authenticated
  using (
    exists (
      select 1 from public.pt_community_members m
      where m.community_id = pt_community_tournament_koins.community_id
        and m.user_id = auth.uid()::text
        and m.status = 'active'
    )
    or community_id = 'pokerforge'
  );

drop policy if exists "ctk_upsert_own" on public.pt_community_tournament_koins;
create policy "ctk_upsert_own"
  on public.pt_community_tournament_koins for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists "ctk_update_own" on public.pt_community_tournament_koins;
create policy "ctk_update_own"
  on public.pt_community_tournament_koins for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create or replace function public.pt_upsert_my_tournament_koins(
  p_community_id text,
  p_koins numeric,
  p_display_name text default null
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
    (community_id, user_id, display_name, koins, updated_at)
  values (cid, uid, uname, bal, now())
  on conflict (community_id, user_id) do update
    set koins = excluded.koins,
        display_name = excluded.display_name,
        updated_at = now();

  return json_build_object('ok', true, 'community_id', cid, 'koins', bal, 'display_name', uname);
end;
$$;

revoke all on function public.pt_upsert_my_tournament_koins(text, numeric, text) from public;
grant execute on function public.pt_upsert_my_tournament_koins(text, numeric, text) to authenticated;

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
      coalesce(nullif(trim(k.display_name), ''), nullif(trim(p.name), ''), 'Jugador') as display_name,
      k.koins,
      k.updated_at
    from public.pt_community_tournament_koins k
    left join public.pt_user_profiles p on p.user_id = k.user_id
    where k.community_id = cid
    union
    /* Incluir miembros activos aún sin fila de koins (saldo inicial 100). */
    select
      m.user_id,
      coalesce(nullif(trim(p.name), ''), 'Jugador') as display_name,
      coalesce(k.koins, 100) as koins,
      coalesce(k.updated_at, m.granted_at) as updated_at
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
