-- Refuerzo: marcar adminCreditAt en el wallet para que el cliente no pise
-- un crédito de admin con un updatedAt local más reciente (p.ej. manos de entrenador).

create or replace function public.pt_admin_set_user_koins(
  p_user_id text,
  p_koins numeric,
  p_community_id text default 'pokerforge',
  p_mode text default 'set',
  p_notify boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid text := auth.uid()::text;
  cid text := lower(trim(coalesce(nullif(trim(p_community_id), ''), 'pokerforge')));
  mode text := lower(trim(coalesce(nullif(trim(p_mode), ''), 'set')));
  prof public.pt_user_profiles;
  payload jsonb := '{}'::jsonb;
  suffix text := '';
  wallet_key text;
  wallet jsonb;
  prev_bal numeric := 0;
  next_bal numeric;
  played int := 0;
  uname text;
  thread_id uuid;
  subj text;
  body text;
  delta numeric;
  notify_community_id text := null;
  credit_at text;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  if p_user_id is null or trim(p_user_id) = '' or p_user_id = 'pt_demo_user' then
    raise exception 'invalid_user';
  end if;

  if mode not in ('set', 'add') then
    raise exception 'invalid_mode';
  end if;

  if p_koins is null or p_koins <> p_koins then
    raise exception 'invalid_koins';
  end if;

  if mode = 'set' and (p_koins < 0 or p_koins > 1000000) then
    raise exception 'invalid_koins';
  end if;

  if mode = 'add' and (p_koins < -1000000 or p_koins > 1000000 or p_koins = 0) then
    raise exception 'invalid_koins';
  end if;

  select * into prof from public.pt_user_profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'user_not_found';
  end if;

  select coalesce(s.payload, '{}'::jsonb)
    into payload
  from public.pt_user_state s
  where s.user_id = p_user_id;

  if payload is null then
    payload := '{}'::jsonb;
  end if;

  if cid <> 'pokerforge' then
    suffix := '_' || cid;
  end if;
  wallet_key := 'tournamentWallet' || suffix;

  wallet := payload -> wallet_key;
  if wallet is null or jsonb_typeof(wallet) <> 'object' then
    wallet := '{}'::jsonb;
  end if;

  prev_bal := coalesce(nullif(wallet->>'balance', '')::numeric, 0);
  played := greatest(
    0,
    coalesce(nullif(wallet->>'tournamentsPlayed', '')::int, 0)
  );

  if mode = 'set' then
    next_bal := round(p_koins::numeric, 2);
  else
    next_bal := round((prev_bal + p_koins)::numeric, 2);
  end if;

  if next_bal < 0 then
    next_bal := 0;
  end if;
  if next_bal > 1000000 then
    next_bal := 1000000;
  end if;

  delta := round((next_bal - prev_bal)::numeric, 2);
  credit_at := to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  wallet := wallet || jsonb_build_object(
    'balance', next_bal,
    'updatedAt', credit_at,
    'adminCreditAt', credit_at,
    'version', greatest(1, coalesce(nullif(wallet->>'version', '')::int, 1)),
    'tournamentsPlayed', played,
    'last', jsonb_build_object(
      'type', 'admin_set_koins',
      'mode', mode,
      'delta', delta,
      'at', credit_at,
      'by', admin_uid
    )
  );

  payload := jsonb_set(payload, array[wallet_key], wallet, true);

  insert into public.pt_user_state (user_id, payload, updated_at)
  values (p_user_id, payload, timezone('utc', now()))
  on conflict (user_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  uname := coalesce(nullif(trim(prof.name), ''), nullif(trim(prof.email), ''), 'Jugador');

  insert into public.pt_community_tournament_koins as t
    (community_id, user_id, display_name, koins, tournaments_played, updated_at)
  values (cid, p_user_id, uname, next_bal, played, timezone('utc', now()))
  on conflict (community_id, user_id) do update
    set koins = excluded.koins,
        display_name = excluded.display_name,
        tournaments_played = greatest(t.tournaments_played, excluded.tournaments_played),
        updated_at = excluded.updated_at;

  if coalesce(p_notify, true) and delta <> 0 then
    if cid <> 'pokerforge' then
      notify_community_id := cid;
    end if;

    subj := 'Ajuste de Koins';
    body := format(
      'Un administrador ha actualizado tu saldo de Koins (%s). Saldo anterior: %s · Saldo nuevo: %s.',
      cid,
      prev_bal,
      next_bal
    );

    insert into public.pt_contact_threads (
      user_id, user_email, user_name, subject, admin_unread_count, user_unread_count, status, community_id
    ) values (
      prof.user_id, prof.email, prof.name, subj, 0, 1, 'open', notify_community_id
    )
    returning id into thread_id;

    insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
    values (thread_id, 'admin', admin_uid, body);
  end if;

  return json_build_object(
    'ok', true,
    'user_id', p_user_id,
    'community_id', cid,
    'mode', mode,
    'previous_balance', prev_bal,
    'balance', next_bal,
    'delta', delta,
    'admin_credit_at', credit_at,
    'notified', coalesce(p_notify, true) and delta <> 0,
    'thread_community_id', notify_community_id
  );
end;
$$;

revoke all on function public.pt_admin_set_user_koins(text, numeric, text, text, boolean) from public;
grant execute on function public.pt_admin_set_user_koins(text, numeric, text, text, boolean) to authenticated;
