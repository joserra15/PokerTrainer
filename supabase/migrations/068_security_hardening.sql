-- 068_security_hardening.sql
-- P0/P1 security audit: AI RPC IDOR, villain cache writes, app_settings read surface.

-- ---------------------------------------------------------------------------
-- H2: pt_check_ai_access / pt_record_ai_usage — only service_role (Edge).
-- Client never calls these; Edge uses SUPABASE_SERVICE_ROLE_KEY.
-- ---------------------------------------------------------------------------
revoke all on function public.pt_record_ai_usage(text, text, text, text) from public;
revoke all on function public.pt_record_ai_usage(text, text, text, text) from authenticated;
grant execute on function public.pt_record_ai_usage(text, text, text, text) to service_role;

revoke all on function public.pt_check_ai_access(text, text) from public;
revoke all on function public.pt_check_ai_access(text, text) from authenticated;
grant execute on function public.pt_check_ai_access(text, text) to service_role;

-- Also lock older overloads if present
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'pt_check_ai_access'
      and pg_get_function_identity_arguments(p.oid) = 'text'
  ) then
    execute 'revoke all on function public.pt_check_ai_access(text) from public';
    execute 'revoke all on function public.pt_check_ai_access(text) from authenticated';
    execute 'grant execute on function public.pt_check_ai_access(text) to service_role';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'pt_record_ai_usage'
      and pg_get_function_identity_arguments(p.oid) = 'text, text, text'
  ) then
    execute 'revoke all on function public.pt_record_ai_usage(text, text, text) from public';
    execute 'revoke all on function public.pt_record_ai_usage(text, text, text) from authenticated';
    execute 'grant execute on function public.pt_record_ai_usage(text, text, text) to service_role';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- M3: pt_app_settings — drop world-readable SELECT; allowlist via RPC.
-- ---------------------------------------------------------------------------
drop policy if exists pt_app_settings_read_auth on public.pt_app_settings;

create or replace function public.pt_get_app_setting(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  allowed text[] := array[
    'villain_assist_enabled',
    'villain_assist_schema_version'
  ];
begin
  if auth.uid() is null and current_setting('role', true) is distinct from 'service_role' then
    -- service_role often has auth.uid() null; allow; authenticated checked below
    null;
  end if;
  if p_key is null or p_key <> all (allowed) then
    raise exception 'forbidden';
  end if;
  select value into v from public.pt_app_settings where key = p_key;
  return coalesce(v, 'null'::jsonb);
end;
$$;

revoke all on function public.pt_get_app_setting(text) from public;
grant execute on function public.pt_get_app_setting(text) to authenticated;
grant execute on function public.pt_get_app_setting(text) to service_role;

-- ---------------------------------------------------------------------------
-- M2: villain assist cache put — only paid plans / admin (not any free user).
-- ---------------------------------------------------------------------------
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
  prof public.pt_user_profiles;
  prev public.pt_villain_assist_cache%rowtype;
  new_freqs jsonb := coalesce(p_action_freqs, '{}'::jsonb);
  n int := 1;
  merged jsonb := '{}'::jsonb;
  k text;
  v1 double precision;
  v2 double precision;
  allowed boolean := false;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid;
  if found then
    allowed := coalesce(prof.is_admin, false)
      or coalesce(prof.plan, 'free') in ('pro', 'premium');
  end if;
  if not allowed then
    raise exception 'forbidden';
  end if;

  select * into prev
  from public.pt_villain_assist_cache
  where spot_key = p_spot_key and schema_version = coalesce(p_schema_version, 1);

  if found then
    n := prev.samples + 1;
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
