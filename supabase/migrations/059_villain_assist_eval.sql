-- 059_villain_assist_eval.sql
-- Spot-EV stats + listado admin de audits (mesa / motor / IA / motivo).

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
  spot_scored bigint;
  spot_agree bigint;
  spot_better bigint;
  spot_worse bigint;
  spot_neutral bigint;
  spot_unscored bigint;
  avg_delta_spot double precision;
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

  /* Spot EV (payload enriquecido). Compat: tagSpot o tag_spot. */
  select count(*) into spot_scored from public.pt_villain_assist_audit
    where created_at >= since
      and coalesce(payload->>'tagSpot', payload->>'tag_spot') is not null
      and coalesce(payload->>'tagSpot', payload->>'tag_spot') <> 'unscored'
      and coalesce((payload->>'spotScored')::boolean, true) is true;
  select count(*) into spot_agree from public.pt_villain_assist_audit
    where created_at >= since and coalesce(payload->>'tagSpot', payload->>'tag_spot') = 'agree';
  select count(*) into spot_better from public.pt_villain_assist_audit
    where created_at >= since and coalesce(payload->>'tagSpot', payload->>'tag_spot') = 'differ_better';
  select count(*) into spot_worse from public.pt_villain_assist_audit
    where created_at >= since and coalesce(payload->>'tagSpot', payload->>'tag_spot') = 'differ_worse';
  select count(*) into spot_neutral from public.pt_villain_assist_audit
    where created_at >= since and coalesce(payload->>'tagSpot', payload->>'tag_spot') = 'differ_neutral';
  select count(*) into spot_unscored from public.pt_villain_assist_audit
    where created_at >= since
      and (
        coalesce(payload->>'tagSpot', payload->>'tag_spot') = 'unscored'
        or coalesce(payload->>'tagSpot', payload->>'tag_spot') is null
      );
  select avg((payload->>'deltaEvSpot')::double precision) into avg_delta_spot
    from public.pt_villain_assist_audit
    where created_at >= since
      and coalesce(payload->>'tagSpot', payload->>'tag_spot') like 'differ%'
      and payload ? 'deltaEvSpot'
      and (payload->>'deltaEvSpot') is not null
      and (payload->>'deltaEvSpot') <> 'null';

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
    'spot_scored', spot_scored,
    'spot_agree', spot_agree,
    'spot_differ_better', spot_better,
    'spot_differ_worse', spot_worse,
    'spot_differ_neutral', spot_neutral,
    'spot_unscored', spot_unscored,
    'spot_unscored_pct', case when total > 0
      then round((spot_unscored::numeric / total) * 1000) / 10 else 0 end,
    'avg_delta_ev_spot_differ', coalesce(round(avg_delta_spot::numeric, 3), 0),
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

create or replace function public.pt_admin_villain_assist_audits_list(
  p_days int default 30,
  p_limit int default 50,
  p_tag text default null,
  p_source text default null,
  p_phase text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  is_adm boolean := false;
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  lim int := greatest(1, least(coalesce(p_limit, 50), 200));
  rows jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select coalesce(is_admin, false) into is_adm
  from public.pt_user_profiles where user_id = uid;
  if not is_adm then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into rows
  from (
    select
      a.id,
      a.created_at,
      a.tag,
      a.source,
      a.phase,
      a.level,
      a.agree,
      a.delta_ev,
      a.charged,
      a.user_id,
      a.payload
    from public.pt_villain_assist_audit a
    where a.created_at >= since
      and (
        p_tag is null or btrim(p_tag) = ''
        or (p_tag = 'differ' and a.tag like 'differ%')
        or a.tag = p_tag
        or coalesce(a.payload->>'tagSpot', a.payload->>'tag_spot') = p_tag
      )
      and (
        p_source is null or btrim(p_source) = ''
        or (p_source = 'cache' and a.source in ('l1', 'l3', 'cache'))
        or a.source = p_source
      )
      and (
        p_phase is null or btrim(p_phase) = ''
        or a.phase = p_phase
        or lower(coalesce(a.payload->'table'->>'phase', '')) = lower(p_phase)
      )
    order by a.created_at desc
    limit lim
  ) t;

  return jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'limit', lim,
    'rows', coalesce(rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.pt_admin_villain_assist_audits_list(int, int, text, text, text) from public;
grant execute on function public.pt_admin_villain_assist_audits_list(int, int, text, text, text) to authenticated;
grant execute on function public.pt_admin_villain_assist_audits_list(int, int, text, text, text) to service_role;
