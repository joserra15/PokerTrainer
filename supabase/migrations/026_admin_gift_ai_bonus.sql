-- Admin: regalar consultas IA como bono y notificar al usuario por Contacto.

create or replace function public.pt_admin_gift_ai_bonus(
  p_user_id text,
  p_credits int,
  p_send_message boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prof public.pt_user_profiles;
  new_bal int;
  new_exp timestamptz;
  thread_id uuid;
  subj text := 'Bono de consultas IA Coach';
  body text;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  if p_user_id is null or trim(p_user_id) = '' or p_user_id = 'pt_demo_user' then
    raise exception 'invalid_user';
  end if;
  if p_credits is null or p_credits < 1 or p_credits > 500 then
    raise exception 'invalid_credits';
  end if;

  select * into prof from public.pt_user_profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'user_not_found';
  end if;

  new_exp := timezone('utc', now()) + interval '12 months';

  if prof.ai_bonus_balance > 0
     and prof.ai_bonus_expires_at is not null
     and prof.ai_bonus_expires_at > timezone('utc', now()) then
    new_bal := prof.ai_bonus_balance + p_credits;
    new_exp := greatest(prof.ai_bonus_expires_at, timezone('utc', now()) + interval '12 months');
  else
    new_bal := p_credits;
  end if;

  update public.pt_user_profiles
  set ai_bonus_balance = new_bal,
      ai_bonus_expires_at = new_exp
  where user_id = p_user_id;

  insert into public.pt_ai_bonus_ledger (
    user_id, delta, balance_after, reason, pack_code
  ) values (
    p_user_id, p_credits, new_bal, 'gift', 'gift'
  );

  if coalesce(p_send_message, true) then
    body := format(
      'Te hemos regalado un bono de %s consultas con IA Coach. Las consultas ya están disponibles en tu cuenta y se consumirán después de las incluidas en tu plan. ¡Buen estudio!',
      p_credits
    );

    insert into public.pt_contact_threads (
      user_id, user_email, user_name, subject, admin_unread_count, user_unread_count, status
    ) values (
      prof.user_id, prof.email, prof.name, subj, 0, 1, 'open'
    )
    returning id into thread_id;

    insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
    values (thread_id, 'admin', uid, body);
  end if;

  return json_build_object(
    'ok', true,
    'balance', new_bal,
    'expires_at', new_exp,
    'credits', p_credits,
    'message_sent', coalesce(p_send_message, true)
  );
end;
$$;

revoke all on function public.pt_admin_gift_ai_bonus(text, int, boolean) from public;
grant execute on function public.pt_admin_gift_ai_bonus(text, int, boolean) to authenticated;
