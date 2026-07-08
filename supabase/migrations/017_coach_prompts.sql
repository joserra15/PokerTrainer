-- Coach IA: resumen persistente, índice RAG ligero, fix admin bootstrap.

alter table public.pt_user_profiles
  add column if not exists coach_summary text,
  add column if not exists coach_summary_at timestamptz;

-- Garantizar admin bootstrap
update public.pt_user_profiles
set is_admin = true
where lower(email) = lower('info@pokerforgeai.com');

create table if not exists public.pt_coach_hand_index (
  id bigserial primary key,
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  spot_key text not null default '',
  hero_code text not null default '',
  street text,
  ev_loss numeric,
  hand_line text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pt_coach_hand_index_user_spot_idx
  on public.pt_coach_hand_index (user_id, spot_key, hero_code, created_at desc);

alter table public.pt_coach_hand_index enable row level security;

drop policy if exists "coach_hand_index_select_own" on public.pt_coach_hand_index;
create policy "coach_hand_index_select_own"
on public.pt_coach_hand_index for select to authenticated
using (user_id = auth.uid()::text);

-- Índice de manos similares (service role desde Edge Function)
create or replace function public.pt_index_coach_hand(
  p_user_id text,
  p_spot_key text,
  p_hero_code text,
  p_street text,
  p_ev_loss numeric,
  p_hand_line text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_hand_line is null or length(trim(p_hand_line)) < 3 then
    return;
  end if;
  insert into public.pt_coach_hand_index (
    user_id, spot_key, hero_code, street, ev_loss, hand_line
  ) values (
    p_user_id,
    coalesce(lower(left(p_spot_key, 80)), ''),
    coalesce(left(p_hero_code, 16), ''),
    left(p_street, 16),
    p_ev_loss,
    left(p_hand_line, 500)
  );
  -- Mantener ~200 entradas por usuario
  delete from public.pt_coach_hand_index
  where user_id = p_user_id
    and id not in (
      select id from public.pt_coach_hand_index
      where user_id = p_user_id
      order by created_at desc
      limit 200
    );
end;
$$;

revoke all on function public.pt_index_coach_hand(text, text, text, text, numeric, text) from public;
grant execute on function public.pt_index_coach_hand(text, text, text, text, numeric, text) to service_role;

create or replace function public.pt_find_similar_coach_hands(
  p_user_id text,
  p_spot_key text,
  p_hero_code text,
  p_limit int default 3
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
      and (
        spot_key = lower(coalesce(p_spot_key, ''))
        or hero_code = coalesce(p_hero_code, '')
      )
    order by hand_line, created_at desc
    limit greatest(1, least(coalesce(p_limit, 3), 5))
  ) sub;
$$;

revoke all on function public.pt_find_similar_coach_hands(text, text, text, int) from public;
grant execute on function public.pt_find_similar_coach_hands(text, text, text, int) to service_role;

create or replace function public.pt_set_coach_summary(
  p_user_id text,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  update public.pt_user_profiles
  set coach_summary = left(coalesce(p_summary, ''), 2000),
      coach_summary_at = timezone('utc', now())
  where user_id = p_user_id;
end;
$$;

revoke all on function public.pt_set_coach_summary(text, text) from public;
grant execute on function public.pt_set_coach_summary(text, text) to service_role;

-- Reforzar bootstrap admin en cada touch
create or replace function public.pt_touch_profile(p_email text, p_name text default '')
returns public.pt_user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pt_user_profiles;
  uid text := auth.uid()::text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.pt_user_profiles (user_id, email, name, last_seen_at)
  values (uid, coalesce(p_email, ''), coalesce(p_name, ''), now())
  on conflict (user_id) do update set
    email = excluded.email,
    name = case when excluded.name <> '' then excluded.name else pt_user_profiles.name end,
    last_seen_at = now();

  update public.pt_user_profiles
  set is_admin = true
  where user_id = uid and lower(coalesce(p_email, email)) = lower('info@pokerforgeai.com');

  select * into r from public.pt_user_profiles where user_id = uid;
  return r;
end;
$$;
