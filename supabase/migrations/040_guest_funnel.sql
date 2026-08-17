-- Embudo anónimo landing → prueba invitado → registro.
-- Sin PII: solo UUID de visitante, nombre de evento y mano (1–5).
-- Ingest vía RPC (anon); lectura solo admin.

create table if not exists public.pt_guest_funnel_events (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  event text not null,
  hand_index smallint,
  source text,
  trap_id text,
  unique_key text not null,
  created_at timestamptz not null default now(),
  constraint pt_guest_funnel_event_ok check (
    event in (
      'landing_view',
      'cta_try',
      'cta_login',
      'guest_start',
      'guest_hand',
      'guest_gate_shown',
      'guest_login',
      'guest_convert'
    )
  ),
  constraint pt_guest_funnel_vid_ok check (
    visitor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  constraint pt_guest_funnel_hand_ok check (
    (event <> 'guest_hand' and hand_index is null)
    or (event = 'guest_hand' and hand_index between 1 and 5)
  ),
  constraint pt_guest_funnel_source_ok check (
    source is null or char_length(source) <= 32
  ),
  constraint pt_guest_funnel_trap_ok check (
    trap_id is null or char_length(trap_id) <= 64
  ),
  constraint pt_guest_funnel_unique unique (unique_key)
);

create index if not exists pt_guest_funnel_created_idx
  on public.pt_guest_funnel_events (created_at);
create index if not exists pt_guest_funnel_event_created_idx
  on public.pt_guest_funnel_events (event, created_at);
create index if not exists pt_guest_funnel_visitor_idx
  on public.pt_guest_funnel_events (visitor_id);

alter table public.pt_guest_funnel_events enable row level security;

revoke all on table public.pt_guest_funnel_events from public;
revoke all on table public.pt_guest_funnel_events from anon;
revoke all on table public.pt_guest_funnel_events from authenticated;

create or replace function public.pt_guest_funnel_ingest(
  p_visitor_id text,
  p_event text,
  p_hand_index int default null,
  p_source text default null,
  p_trap_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  vid text := lower(trim(coalesce(p_visitor_id, '')));
  ev text := lower(trim(coalesce(p_event, '')));
  hid int := p_hand_index;
  src text := nullif(left(trim(coalesce(p_source, '')), 32), '');
  trap text := nullif(left(trim(coalesce(p_trap_id, '')), 64), '');
  n int;
  stored boolean := false;
  ukey text;
begin
  if vid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return json_build_object('ok', false, 'error', 'bad_visitor');
  end if;
  if ev not in (
    'landing_view', 'cta_try', 'cta_login',
    'guest_start', 'guest_hand', 'guest_gate_shown',
    'guest_login', 'guest_convert'
  ) then
    return json_build_object('ok', false, 'error', 'bad_event');
  end if;
  if ev = 'guest_hand' then
    if hid is null or hid < 1 or hid > 5 then
      return json_build_object('ok', false, 'error', 'bad_hand');
    end if;
  else
    hid := null;
  end if;

  select count(*)::int into n
  from public.pt_guest_funnel_events
  where visitor_id = vid;
  if n >= 40 then
    return json_build_object('ok', true, 'stored', false, 'error', 'limit');
  end if;

  ukey := vid || ':' || ev;
  if ev = 'guest_hand' then
    ukey := vid || ':guest_hand:' || hid::text;
  elsif ev = 'landing_view' then
    ukey := vid || ':landing_view:' || to_char(timezone('utc', now()), 'YYYY-MM-DD');
  end if;

  insert into public.pt_guest_funnel_events (
    visitor_id, event, hand_index, source, trap_id, unique_key
  ) values (
    vid, ev, hid, src, trap, ukey
  )
  on conflict on constraint pt_guest_funnel_unique do nothing;

  get diagnostics n = row_count;
  stored := n > 0;
  return json_build_object('ok', true, 'stored', stored);
end;
$$;

revoke all on function public.pt_guest_funnel_ingest(text, text, int, text, text) from public;
grant execute on function public.pt_guest_funnel_ingest(text, text, int, text, text) to anon, authenticated;

create or replace function public.pt_admin_guest_funnel(p_days int default 30)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  days int := coalesce(p_days, 30);
  cutoff timestamptz;
  result json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  if days <= 0 then
    cutoff := timestamptz '1970-01-01+00';
    days := 0;
  else
    days := least(greatest(days, 1), 365);
    cutoff := now() - make_interval(days => days);
  end if;

  with ev as (
    select visitor_id, event, hand_index, created_at
    from public.pt_guest_funnel_events
    where created_at >= cutoff
  ),
  landing as (
    select distinct visitor_id from ev where event = 'landing_view'
  ),
  starters as (
    select distinct visitor_id from ev where event = 'guest_start'
  ),
  all_login as (
    select distinct visitor_id from public.pt_guest_funnel_events where event = 'cta_login'
  ),
  all_try as (
    select distinct visitor_id from public.pt_guest_funnel_events where event = 'cta_try'
  ),
  all_start as (
    select distinct visitor_id from public.pt_guest_funnel_events where event = 'guest_start'
  ),
  all_convert as (
    select distinct visitor_id from public.pt_guest_funnel_events where event = 'guest_convert'
  ),
  max_hands as (
    select s.visitor_id, coalesce(max(h.hand_index), 0)::int as max_h
    from starters s
    left join public.pt_guest_funnel_events h
      on h.visitor_id = s.visitor_id and h.event = 'guest_hand'
    group by s.visitor_id
  ),
  drop_rows as (
    select
      gs.hand,
      count(m.visitor_id)::int as visitors,
      count(m.visitor_id) filter (where c.visitor_id is not null)::int as converted
    from generate_series(0, 5) as gs(hand)
    left join max_hands m on m.max_h = gs.hand
    left join all_convert c on c.visitor_id = m.visitor_id
    group by gs.hand
  )
  select json_build_object(
    'ok', true,
    'days', days,
    'since', cutoff,
    'landing', (select count(*)::int from landing),
    'cta_login', (
      select count(*)::int from landing l join all_login x on x.visitor_id = l.visitor_id
    ),
    'no_login', (
      select count(*)::int from landing l
      where not exists (select 1 from all_login x where x.visitor_id = l.visitor_id)
    ),
    'bounced', (
      select count(*)::int from landing l
      where not exists (select 1 from all_login x where x.visitor_id = l.visitor_id)
        and not exists (select 1 from all_try t where t.visitor_id = l.visitor_id)
        and not exists (select 1 from all_start s where s.visitor_id = l.visitor_id)
    ),
    'cta_try', (select count(distinct visitor_id)::int from ev where event = 'cta_try'),
    'guest_start', (select count(*)::int from starters),
    'played', (select count(*)::int from max_hands where max_h >= 1),
    'gate_shown', (select count(distinct visitor_id)::int from ev where event = 'guest_gate_shown'),
    'guest_login', (select count(distinct visitor_id)::int from ev where event = 'guest_login'),
    'converted', (
      select count(*)::int from starters s
      join all_convert c on c.visitor_id = s.visitor_id
    ),
    'converted_period', (select count(distinct visitor_id)::int from ev where event = 'guest_convert'),
    'drop_by_hand', (
      select coalesce(json_agg(row_to_json(d) order by d.hand), '[]'::json)
      from drop_rows d
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.pt_admin_guest_funnel(int) from public;
grant execute on function public.pt_admin_guest_funnel(int) to authenticated;
