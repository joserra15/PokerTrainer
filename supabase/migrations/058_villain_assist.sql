-- 058_villain_assist.sql
-- Asistente IA villanos (torneos Pro): flags admin, caché L3, auditoría.

create table if not exists public.pt_app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pt_app_settings enable row level security;

drop policy if exists pt_app_settings_read_auth on public.pt_app_settings;
create policy pt_app_settings_read_auth on public.pt_app_settings
  for select to authenticated
  using (true);

insert into public.pt_app_settings (key, value)
values
  ('villain_assist_enabled', '{"enabled": false}'::jsonb),
  ('villain_assist_schema_version', '{"version": 1}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.pt_villain_assist_cache (
  spot_key text not null,
  schema_version int not null default 1,
  action_freqs jsonb not null default '{}'::jsonb,
  size_bb double precision,
  samples int not null default 0,
  confidence double precision not null default 0.5,
  last_model text,
  prompt_version text,
  updated_at timestamptz not null default now(),
  primary key (spot_key, schema_version)
);

create index if not exists pt_villain_assist_cache_updated_idx
  on public.pt_villain_assist_cache (updated_at desc);

alter table public.pt_villain_assist_cache enable row level security;

drop policy if exists pt_villain_assist_cache_read on public.pt_villain_assist_cache;
create policy pt_villain_assist_cache_read on public.pt_villain_assist_cache
  for select to authenticated
  using (true);

create table if not exists public.pt_villain_assist_audit (
  id bigserial primary key,
  user_id text,
  payload jsonb not null default '{}'::jsonb,
  tag text,
  source text,
  phase text,
  level text,
  agree boolean,
  delta_ev double precision,
  charged boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists pt_villain_assist_audit_created_idx
  on public.pt_villain_assist_audit (created_at desc);
create index if not exists pt_villain_assist_audit_tag_idx
  on public.pt_villain_assist_audit (tag);

alter table public.pt_villain_assist_audit enable row level security;

-- Lectura solo admin vía RPC; insert via security definer.

create or replace function public.pt_get_app_setting(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  select value into v from public.pt_app_settings where key = p_key;
  return coalesce(v, 'null'::jsonb);
end;
$$;

revoke all on function public.pt_get_app_setting(text) from public;
grant execute on function public.pt_get_app_setting(text) to authenticated;
grant execute on function public.pt_get_app_setting(text) to service_role;

create or replace function public.pt_admin_set_app_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  is_adm boolean := false;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select coalesce(is_admin, false) into is_adm
  from public.pt_user_profiles where user_id = uid;
  if not is_adm then
    raise exception 'forbidden';
  end if;
  insert into public.pt_app_settings (key, value, updated_at)
  values (p_key, coalesce(p_value, '{}'::jsonb), now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
  return coalesce(p_value, '{}'::jsonb);
end;
$$;

revoke all on function public.pt_admin_set_app_setting(text, jsonb) from public;
grant execute on function public.pt_admin_set_app_setting(text, jsonb) to authenticated;
grant execute on function public.pt_admin_set_app_setting(text, jsonb) to service_role;

create or replace function public.pt_villain_assist_cache_get(
  p_spot_key text,
  p_schema_version int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pt_villain_assist_cache%rowtype;
begin
  select * into r
  from public.pt_villain_assist_cache
  where spot_key = p_spot_key and schema_version = coalesce(p_schema_version, 1);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'spot_key', r.spot_key,
    'schema_version', r.schema_version,
    'action_freqs', r.action_freqs,
    'freqs', r.action_freqs,
    'size_bb', r.size_bb,
    'samples', r.samples,
    'confidence', r.confidence,
    'last_model', r.last_model,
    'prompt_version', r.prompt_version,
    'updated_at', r.updated_at
  );
end;
$$;

revoke all on function public.pt_villain_assist_cache_get(text, int) from public;
grant execute on function public.pt_villain_assist_cache_get(text, int) to authenticated;
grant execute on function public.pt_villain_assist_cache_get(text, int) to service_role;

create or replace function public.pt_villain_assist_cache_put(
  p_spot_key text,
  p_schema_version int,
  p_action_freqs jsonb,
  p_size_bb double precision default null,
  p_confidence double precision default 0.5,
  p_model text default null,
  p_prompt_version text default 'v1'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prev public.pt_villain_assist_cache%rowtype;
  new_freqs jsonb := coalesce(p_action_freqs, '{}'::jsonb);
  n int := 1;
  merged jsonb := '{}'::jsonb;
  k text;
  v1 double precision;
  v2 double precision;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prev
  from public.pt_villain_assist_cache
  where spot_key = p_spot_key and schema_version = coalesce(p_schema_version, 1);

  if found then
    n := prev.samples + 1;
    -- media ponderada de freqs
    for k in select jsonb_object_keys(prev.action_freqs || new_freqs)
    loop
      v1 := coalesce((prev.action_freqs ->> k)::double precision, 0);
      v2 := coalesce((new_freqs ->> k)::double precision, 0);
      merged := merged || jsonb_build_object(k, ((v1 * prev.samples) + v2) / n);
    end loop;
    update public.pt_villain_assist_cache set
      action_freqs = merged,
      size_bb = case
        when p_size_bb is null then size_bb
        when size_bb is null then p_size_bb
        else ((size_bb * prev.samples) + p_size_bb) / n
      end,
      samples = n,
      confidence = ((confidence * prev.samples) + coalesce(p_confidence, 0.5)) / n,
      last_model = coalesce(p_model, last_model),
      prompt_version = coalesce(p_prompt_version, prompt_version),
      updated_at = now()
    where spot_key = p_spot_key and schema_version = coalesce(p_schema_version, 1);
  else
    insert into public.pt_villain_assist_cache (
      spot_key, schema_version, action_freqs, size_bb, samples, confidence, last_model, prompt_version
    ) values (
      p_spot_key, coalesce(p_schema_version, 1), new_freqs, p_size_bb, 1,
      coalesce(p_confidence, 0.5), p_model, p_prompt_version
    );
  end if;

  return public.pt_villain_assist_cache_get(p_spot_key, coalesce(p_schema_version, 1));
end;
$$;

revoke all on function public.pt_villain_assist_cache_put(text, int, jsonb, double precision, double precision, text, text) from public;
grant execute on function public.pt_villain_assist_cache_put(text, int, jsonb, double precision, double precision, text, text) to authenticated;
grant execute on function public.pt_villain_assist_cache_put(text, int, jsonb, double precision, double precision, text, text) to service_role;

create or replace function public.pt_villain_assist_audit_insert(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  p jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  insert into public.pt_villain_assist_audit (
    user_id, payload, tag, source, phase, level, agree, delta_ev, charged
  ) values (
    uid,
    p,
    p->>'tag',
    p->>'source',
    p->>'phase',
    p->>'level',
    case when p ? 'agree' then (p->>'agree')::boolean else null end,
    case when p ? 'deltaEvVillain' then (p->>'deltaEvVillain')::double precision else null end,
    coalesce((p->>'charged')::boolean, false)
  );
end;
$$;

revoke all on function public.pt_villain_assist_audit_insert(jsonb) from public;
grant execute on function public.pt_villain_assist_audit_insert(jsonb) to authenticated;
grant execute on function public.pt_villain_assist_audit_insert(jsonb) to service_role;

create or replace function public.pt_admin_villain_assist_stats(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  is_adm boolean := false;
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  total bigint;
  agrees bigint;
  differs bigint;
  better bigint;
  worse bigint;
  neutral bigint;
  gemini_n bigint;
  cache_n bigint;
  charged_n bigint;
  avg_delta double precision;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select coalesce(is_admin, false) into is_adm
  from public.pt_user_profiles where user_id = uid;
  if not is_adm then
    raise exception 'forbidden';
  end if;

  select count(*) into total from public.pt_villain_assist_audit where created_at >= since;
  select count(*) into agrees from public.pt_villain_assist_audit where created_at >= since and tag = 'agree';
  select count(*) into differs from public.pt_villain_assist_audit where created_at >= since and tag like 'differ%';
  select count(*) into better from public.pt_villain_assist_audit where created_at >= since and tag = 'differ_better';
  select count(*) into worse from public.pt_villain_assist_audit where created_at >= since and tag = 'differ_worse';
  select count(*) into neutral from public.pt_villain_assist_audit where created_at >= since and tag = 'differ_neutral';
  select count(*) into gemini_n from public.pt_villain_assist_audit where created_at >= since and source = 'gemini';
  select count(*) into cache_n from public.pt_villain_assist_audit
    where created_at >= since and source in ('l1', 'l3', 'cache');
  select count(*) into charged_n from public.pt_villain_assist_audit where created_at >= since and charged is true;
  select avg(delta_ev) into avg_delta from public.pt_villain_assist_audit
    where created_at >= since and tag like 'differ%' and delta_ev is not null;

  return jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'total', total,
    'agree', agrees,
    'differ', differs,
    'differ_better', better,
    'differ_worse', worse,
    'differ_neutral', neutral,
    'agree_pct', case when total > 0 then round((agrees::numeric / total) * 1000) / 10 else 0 end,
    'differ_pct', case when total > 0 then round((differs::numeric / total) * 1000) / 10 else 0 end,
    'gemini', gemini_n,
    'cache_hits', cache_n,
    'cache_hit_pct', case when (gemini_n + cache_n) > 0
      then round((cache_n::numeric / (gemini_n + cache_n)) * 1000) / 10 else 0 end,
    'charged', charged_n,
    'avg_delta_ev_differ', coalesce(round(avg_delta::numeric, 3), 0),
    'feature_enabled', coalesce(
      (select (value->>'enabled')::boolean from public.pt_app_settings where key = 'villain_assist_enabled'),
      false
    ),
    'cache_rows', (select count(*) from public.pt_villain_assist_cache)
  );
end;
$$;

revoke all on function public.pt_admin_villain_assist_stats(int) from public;
grant execute on function public.pt_admin_villain_assist_stats(int) to authenticated;
grant execute on function public.pt_admin_villain_assist_stats(int) to service_role;
