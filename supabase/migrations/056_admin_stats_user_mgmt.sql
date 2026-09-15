-- Stats admin enriquecidas para gestión de usuarios:
-- desglose por plan + solicitudes FOUNDER pendientes.

create or replace function public.pt_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select json_build_object(
    'total_users', (select count(*) from public.pt_user_profiles),
    'active_today', (
      select count(*) from public.pt_user_profiles
      where last_seen_at >= date_trunc('day', now() at time zone 'utc')
    ),
    'online_now', (
      select count(*) from public.pt_user_profiles
      where last_seen_at >= now() - interval '15 minutes'
    ),
    'ai_requests_today', (
      select count(*) from public.pt_ai_usage
      where created_at >= date_trunc('day', now() at time zone 'utc')
    ),
    'by_plan', json_build_object(
      'free', (select count(*) from public.pt_user_profiles where coalesce(plan, 'free') = 'free'),
      'pro', (select count(*) from public.pt_user_profiles where plan = 'pro'),
      'premium', (select count(*) from public.pt_user_profiles where plan = 'premium')
    ),
    'pending_founder', (
      select count(*) from public.pt_user_profiles p
      where (
        (coalesce(p.is_founder_study, false) = false and p.founder_study_requested_at is not null)
        or (coalesce(p.is_founder_coach, false) = false and p.founder_coach_requested_at is not null)
      )
    ),
    'active_paid', (
      select count(*) from public.pt_user_profiles p
      where coalesce(p.plan, 'free') in ('pro', 'premium')
        and coalesce(p.subscription_status, 'none') in ('active', 'trialing')
        and (
          p.subscription_period_end is null
          or p.subscription_period_end > timezone('utc', now())
        )
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.pt_admin_stats() from public;
grant execute on function public.pt_admin_stats() to authenticated;
