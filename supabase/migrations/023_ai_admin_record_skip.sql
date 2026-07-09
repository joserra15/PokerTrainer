-- Admin: no consumir cupo ni bono al registrar uso IA (coherente con analyze-hand)

create or replace function public.pt_record_ai_usage(p_user_id text, p_mode text, p_source text default 'plan')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.pt_user_profiles;
  new_bal int;
begin
  select * into prof from public.pt_user_profiles where user_id = p_user_id;
  if not found then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if public.pt_profile_is_admin(prof) then
    insert into public.pt_ai_usage (user_id, mode)
    values (p_user_id, coalesce(p_mode, 'report'));
    return json_build_object('ok', true, 'admin', true);
  end if;

  insert into public.pt_ai_usage (user_id, mode)
  values (p_user_id, coalesce(p_mode, 'report'));

  insert into public.pt_usage_monthly (user_id, usage_month, ai_reports)
  values (p_user_id, public.pt_month_start_utc(), 1)
  on conflict (user_id, usage_month) do update
  set ai_reports = pt_usage_monthly.ai_reports + 1;

  if p_source = 'bonus' then
    select * into prof from public.pt_user_profiles where user_id = p_user_id for update;
    if not found then
      return json_build_object('ok', false, 'error', 'user_not_found');
    end if;
    if public.pt_bonus_effective_balance(prof) <= 0 then
      return json_build_object('ok', false, 'error', 'no_bonus');
    end if;
    new_bal := prof.ai_bonus_balance - 1;
    update public.pt_user_profiles
    set ai_bonus_balance = new_bal
    where user_id = p_user_id;
    insert into public.pt_ai_bonus_ledger (user_id, delta, balance_after, reason)
    values (p_user_id, -1, new_bal, 'ai_usage');
  end if;

  return json_build_object('ok', true);
end;
$$;
