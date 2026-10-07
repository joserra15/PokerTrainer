-- 064_daily_spot.sql
-- Spot del día compartido: mismo reto para todos (Europe/Madrid).
-- Generación aleatoria con parámetros (kind preferido, anti-repetición).

create table if not exists public.pt_daily_spots (
  spot_date date primary key,
  spot_id text not null,
  kind text not null,
  source text not null default 'rpc',
  created_at timestamptz not null default now()
);

create index if not exists pt_daily_spots_created_idx
  on public.pt_daily_spots (created_at desc);

alter table public.pt_daily_spots enable row level security;

drop policy if exists pt_daily_spots_read_auth on public.pt_daily_spots;
create policy pt_daily_spots_read_auth on public.pt_daily_spots
  for select to authenticated
  using (true);

-- Catálogo alineado con PTSchoolViralQuizzes.DAILY_POOL (cliente).
insert into public.pt_app_settings (key, value)
values (
  'daily_spot_catalog',
  '[
    {"id":"d01-01","kind":"decisionQuiz"},
    {"id":"d01-02","kind":"decisionQuiz"},
    {"id":"d01-03","kind":"decisionQuiz"},
    {"id":"d01-04","kind":"decisionQuiz"},
    {"id":"d02-01","kind":"decisionQuiz"},
    {"id":"d02-02","kind":"decisionQuiz"},
    {"id":"o01-01","kind":"oddsQuiz"},
    {"id":"o01-02","kind":"oddsQuiz"},
    {"id":"o01-03","kind":"oddsQuiz"},
    {"id":"b01-01","kind":"blockerQuiz"},
    {"id":"b01-02","kind":"blockerQuiz"},
    {"id":"b01-03","kind":"blockerQuiz"},
    {"id":"d03-01","kind":"sizingQuiz"},
    {"id":"d03-02","kind":"sizingQuiz"},
    {"id":"f01-01","kind":"rfiQuiz"},
    {"id":"f01-02","kind":"rfiQuiz"},
    {"id":"e01-01","kind":"equityQuiz"},
    {"id":"q01-01","kind":"textureQuiz"}
  ]'::jsonb
)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

-- Kind preferido por día de semana (0=dom … 6=sáb), alineado con IG_WEEK del cliente.
create or replace function public.pt_daily_spot_preferred_kind(p_date date)
returns text
language sql
immutable
as $$
  select case extract(dow from p_date)::int
    when 1 then 'decisionQuiz'
    when 2 then 'rfiQuiz'
    when 3 then 'oddsQuiz'
    when 4 then 'sizingQuiz'
    when 5 then 'blockerQuiz'
    when 6 then 'equityQuiz'
    else 'textureQuiz'
  end;
$$;

create or replace function public.pt_get_or_create_daily_spot(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
  existing public.pt_daily_spots%rowtype;
  catalog jsonb;
  preferred text;
  yday date;
  ykind text;
  recent_ids text[];
  cand jsonb;
  pick jsonb;
  chosen_id text;
  chosen_kind text;
begin
  d := coalesce(p_date, public.pt_today_utc());

  select * into existing from public.pt_daily_spots where spot_date = d;
  if found then
    return jsonb_build_object(
      'spot_date', existing.spot_date,
      'spot_id', existing.spot_id,
      'kind', existing.kind,
      'source', existing.source,
      'created_at', existing.created_at
    );
  end if;

  select value into catalog
  from public.pt_app_settings
  where key = 'daily_spot_catalog';

  if catalog is null or jsonb_typeof(catalog) <> 'array' or jsonb_array_length(catalog) = 0 then
    return null;
  end if;

  preferred := public.pt_daily_spot_preferred_kind(d);
  yday := d - 1;

  select kind into ykind from public.pt_daily_spots where spot_date = yday;

  select coalesce(array_agg(spot_id), '{}'::text[])
  into recent_ids
  from public.pt_daily_spots
  where spot_date >= d - 7 and spot_date < d;

  -- Candidatos: excluir ids de los últimos 7 días.
  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into cand
  from jsonb_array_elements(catalog) elem
  where not (elem->>'id' = any (recent_ids));

  if cand is null or jsonb_array_length(cand) = 0 then
    cand := catalog;
  end if;

  -- Preferir kind del calendario IG si hay opciones.
  if exists (
    select 1 from jsonb_array_elements(cand) e where e->>'kind' = preferred
  ) then
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    into cand
    from jsonb_array_elements(cand) e
    where e->>'kind' = preferred;
  elsif ykind is not null and exists (
    select 1 from jsonb_array_elements(cand) e where e->>'kind' <> ykind
  ) then
    -- Evitar el mismo kind que ayer si hay alternativa.
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    into cand
    from jsonb_array_elements(cand) e
    where e->>'kind' <> ykind;
  end if;

  select e into pick
  from jsonb_array_elements(cand) e
  order by random()
  limit 1;

  if pick is null then
    select e into pick
    from jsonb_array_elements(catalog) e
    order by random()
    limit 1;
  end if;

  chosen_id := pick->>'id';
  chosen_kind := pick->>'kind';

  insert into public.pt_daily_spots (spot_date, spot_id, kind, source)
  values (d, chosen_id, chosen_kind, 'rpc')
  on conflict (spot_date) do nothing;

  select * into existing from public.pt_daily_spots where spot_date = d;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'spot_date', existing.spot_date,
    'spot_id', existing.spot_id,
    'kind', existing.kind,
    'source', existing.source,
    'created_at', existing.created_at
  );
end;
$$;

revoke all on function public.pt_get_or_create_daily_spot(date) from public;
grant execute on function public.pt_get_or_create_daily_spot(date) to authenticated;
grant execute on function public.pt_get_or_create_daily_spot(date) to service_role;

grant select on public.pt_daily_spots to authenticated;
grant all on public.pt_daily_spots to service_role;
