-- Aislar contexto ForgeCoach (resumen + índice de manos similares) por comunidad.
-- PokerForge: community_id NULL / coach_summary en pt_user_profiles.
-- MTTLab (y otras): community_id = id de comunidad.

alter table public.pt_coach_hand_index
  add column if not exists community_id text references public.pt_communities(id);

create index if not exists pt_coach_hand_index_user_community_spot_idx
  on public.pt_coach_hand_index (user_id, community_id, spot_key, hero_code, created_at desc);

create table if not exists public.pt_community_coach_summary (
  community_id text not null references public.pt_communities(id) on delete cascade,
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  summary text,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (community_id, user_id)
);

alter table public.pt_community_coach_summary enable row level security;

drop policy if exists "community_coach_summary_select_own" on public.pt_community_coach_summary;
create policy "community_coach_summary_select_own"
on public.pt_community_coach_summary for select to authenticated
using (user_id = auth.uid()::text);

drop function if exists public.pt_index_coach_hand(text, text, text, text, numeric, text);
create or replace function public.pt_index_coach_hand(
  p_user_id text,
  p_spot_key text,
  p_hero_code text,
  p_street text,
  p_ev_loss numeric,
  p_hand_line text,
  p_community_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid text;
begin
  if p_user_id is null or p_hand_line is null or length(trim(p_hand_line)) < 3 then
    return;
  end if;
  cid := nullif(trim(coalesce(p_community_id, '')), '');
  if cid = 'pokerforge' then cid := null; end if;

  insert into public.pt_coach_hand_index (
    user_id, spot_key, hero_code, street, ev_loss, hand_line, community_id
  ) values (
    p_user_id,
    coalesce(lower(left(p_spot_key, 80)), ''),
    coalesce(left(p_hero_code, 16), ''),
    left(p_street, 16),
    p_ev_loss,
    left(p_hand_line, 500),
    cid
  );

  -- Mantener ~200 entradas por usuario y comunidad (NULL = PokerForge)
  delete from public.pt_coach_hand_index
  where user_id = p_user_id
    and community_id is not distinct from cid
    and id not in (
      select id from public.pt_coach_hand_index
      where user_id = p_user_id
        and community_id is not distinct from cid
      order by created_at desc
      limit 200
    );
end;
$$;

revoke all on function public.pt_index_coach_hand(text, text, text, text, numeric, text, text) from public;
grant execute on function public.pt_index_coach_hand(text, text, text, text, numeric, text, text) to service_role;

drop function if exists public.pt_find_similar_coach_hands(text, text, text, int);
create or replace function public.pt_find_similar_coach_hands(
  p_user_id text,
  p_spot_key text,
  p_hero_code text,
  p_limit int default 3,
  p_community_id text default null
)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(hand_line order by created_at desc), '{}')
  from (
    select distinct on (hand_line) hand_line, created_at
    from public.pt_coach_hand_index
    where user_id = p_user_id
      and community_id is not distinct from (
        case
          when nullif(trim(coalesce(p_community_id, '')), '') is null then null
          when lower(trim(p_community_id)) = 'pokerforge' then null
          else trim(p_community_id)
        end
      )
      and (
        spot_key = lower(coalesce(p_spot_key, ''))
        or hero_code = coalesce(p_hero_code, '')
      )
    order by hand_line, created_at desc
    limit greatest(1, least(coalesce(p_limit, 3), 5))
  ) sub;
$$;

revoke all on function public.pt_find_similar_coach_hands(text, text, text, int, text) from public;
grant execute on function public.pt_find_similar_coach_hands(text, text, text, int, text) to service_role;

drop function if exists public.pt_set_coach_summary(text, text);
create or replace function public.pt_set_coach_summary(
  p_user_id text,
  p_summary text,
  p_community_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid text;
begin
  if p_user_id is null then return; end if;
  cid := nullif(trim(coalesce(p_community_id, '')), '');
  if cid = 'pokerforge' then cid := null; end if;

  if cid is null then
    update public.pt_user_profiles
    set coach_summary = left(coalesce(p_summary, ''), 2000),
        coach_summary_at = timezone('utc', now())
    where user_id = p_user_id;
    return;
  end if;

  insert into public.pt_community_coach_summary (community_id, user_id, summary, updated_at)
  values (cid, p_user_id, left(coalesce(p_summary, ''), 2000), timezone('utc', now()))
  on conflict (community_id, user_id) do update
    set summary = excluded.summary,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.pt_set_coach_summary(text, text, text) from public;
grant execute on function public.pt_set_coach_summary(text, text, text) to service_role;

create or replace function public.pt_get_coach_summary(
  p_user_id text,
  p_community_id text default null
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid text;
  s text;
begin
  if p_user_id is null then return null; end if;
  cid := nullif(trim(coalesce(p_community_id, '')), '');
  if cid = 'pokerforge' then cid := null; end if;

  if cid is null then
    select coach_summary into s from public.pt_user_profiles where user_id = p_user_id;
    return s;
  end if;

  select summary into s
  from public.pt_community_coach_summary
  where community_id = cid and user_id = p_user_id;
  return s;
end;
$$;

revoke all on function public.pt_get_coach_summary(text, text) from public;
grant execute on function public.pt_get_coach_summary(text, text) to service_role;
