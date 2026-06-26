-- Study: 3 consultas IA Coach/mes (prueba del upsell a Coach)
create or replace function public.pt_plan_limits(p_plan text)
returns json
language sql
immutable
as $$
  select case p_plan
    when 'pro' then json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', 3,
      'history_days', null
    )
    when 'premium' then json_build_object(
      'trainer_hands_per_day', null,
      'import_sessions_per_month', null,
      'max_hands_per_import', null,
      'ai_reports_per_month', 30,
      'history_days', null
    )
    else json_build_object(
      'trainer_hands_per_day', 15,
      'import_sessions_per_month', 1,
      'max_hands_per_import', 200,
      'ai_reports_per_month', 0,
      'history_days', 30
    )
  end;
$$;
