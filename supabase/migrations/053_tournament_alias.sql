-- Alias de torneo: nombre público en mesa y clasificación (único entre usuarios).

alter table public.pt_user_profiles
  add column if not exists tournament_alias text;

comment on column public.pt_user_profiles.tournament_alias is
  'Apodo público en torneos (mesa y clasificación). Único case-insensitive.';

-- Unicidad case-insensitive; NULL / vacío = sin alias (usa el nombre real).
create unique index if not exists pt_user_profiles_tournament_alias_uidx
  on public.pt_user_profiles (lower(trim(tournament_alias)))
  where tournament_alias is not null and trim(tournament_alias) <> '';

-- Validación compartida (formato + unicidad). Devuelve JSON { ok, alias?, error? }.
create or replace function public.pt_normalize_tournament_alias(p_alias text)
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  raw text := trim(coalesce(p_alias, ''));
  cleaned text;
begin
  if raw = '' then
    return json_build_object('ok', true, 'alias', null);
  end if;

  cleaned := raw;
  if char_length(cleaned) < 3 or char_length(cleaned) > 20 then
    return json_build_object('ok', false, 'error', 'alias_length');
  end if;

  /* Letras, dígitos, _ y -; debe empezar y terminar en alfanumérico. */
  if cleaned !~ '^[A-Za-z0-9]([A-Za-z0-9_-]*[A-Za-z0-9])?$' then
    return json_build_object('ok', false, 'error', 'alias_format');
  end if;

  if lower(cleaned) in ('hero', 'heroe', 'héroe', 'jugador', 'admin', 'pokerforge') then
    return json_build_object('ok', false, 'error', 'alias_reserved');
  end if;

  return json_build_object('ok', true, 'alias', cleaned);
end;
$$;

revoke all on function public.pt_normalize_tournament_alias(text) from public;
grant execute on function public.pt_normalize_tournament_alias(text) to authenticated;

create or replace function public.pt_set_tournament_alias(p_alias text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  norm json;
  cleaned text;
  taken boolean;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.pt_user_profiles where user_id = uid) then
    raise exception 'user_not_found';
  end if;

  norm := public.pt_normalize_tournament_alias(p_alias);
  if coalesce((norm->>'ok')::boolean, false) is not true then
    return json_build_object(
      'ok', false,
      'error', coalesce(norm->>'error', 'alias_invalid')
    );
  end if;

  cleaned := nullif(norm->>'alias', '');

  if cleaned is not null then
    select exists (
      select 1
      from public.pt_user_profiles p
      where lower(trim(p.tournament_alias)) = lower(cleaned)
        and p.user_id <> uid
    ) into taken;
    if taken then
      return json_build_object('ok', false, 'error', 'alias_taken');
    end if;
  end if;

  update public.pt_user_profiles
  set tournament_alias = cleaned
  where user_id = uid;

  -- Propagar a clasificación de Koins (alias o nombre real si se borró).
  update public.pt_community_tournament_koins k
  set display_name = coalesce(
        cleaned,
        (select nullif(trim(p.name), '') from public.pt_user_profiles p where p.user_id = uid),
        'Jugador'
      ),
      updated_at = now()
  where k.user_id = uid;

  return json_build_object('ok', true, 'alias', cleaned);
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'alias_taken');
end;
$$;

revoke all on function public.pt_set_tournament_alias(text) from public;
grant execute on function public.pt_set_tournament_alias(text) to authenticated;

-- Preferir alias de perfil al publicar / listar ranking.
create or replace function public.pt_upsert_my_tournament_koins(
  p_community_id text,
  p_koins numeric,
  p_display_name text default null,
  p_tournaments_played integer default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  cid text := lower(trim(coalesce(p_community_id, 'pokerforge')));
  bal numeric := greatest(0, coalesce(p_koins, 0));
  played integer := greatest(0, coalesce(p_tournaments_played, 0));
  uname text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if cid <> 'pokerforge' then
    if not exists (
      select 1 from public.pt_community_members m
      where m.community_id = cid and m.user_id = uid and m.status = 'active'
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  select coalesce(
      nullif(trim(p.tournament_alias), ''),
      nullif(trim(p_display_name), ''),
      nullif(trim(p.name), ''),
      p.email,
      'Jugador'
    )
    into uname
  from public.pt_user_profiles p
  where p.user_id = uid;

  if uname is null then
    uname := coalesce(nullif(trim(p_display_name), ''), 'Jugador');
  end if;

  insert into public.pt_community_tournament_koins as t
    (community_id, user_id, display_name, koins, tournaments_played, updated_at)
  values (cid, uid, uname, bal, played, now())
  on conflict (community_id, user_id) do update
    set koins = excluded.koins,
        display_name = excluded.display_name,
        tournaments_played = case
          when p_tournaments_played is null then t.tournaments_played
          else greatest(t.tournaments_played, excluded.tournaments_played)
        end,
        updated_at = now();

  return json_build_object(
    'ok', true,
    'community_id', cid,
    'koins', bal,
    'tournaments_played', (
      select tournaments_played from public.pt_community_tournament_koins
      where community_id = cid and user_id = uid
    ),
    'display_name', uname
  );
end;
$$;

revoke all on function public.pt_upsert_my_tournament_koins(text, numeric, text, integer) from public;
grant execute on function public.pt_upsert_my_tournament_koins(text, numeric, text, integer) to authenticated;

create or replace function public.pt_list_community_tournament_koins(p_community_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  cid text := lower(trim(coalesce(p_community_id, 'pokerforge')));
  rows json;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if cid <> 'pokerforge' then
    if not exists (
      select 1 from public.pt_community_members m
      where m.community_id = cid and m.user_id = uid and m.status = 'active'
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  select coalesce(json_agg(row_to_json(x) order by x.koins desc, x.display_name asc), '[]'::json)
  into rows
  from (
    select
      k.user_id,
      coalesce(
        nullif(trim(p.tournament_alias), ''),
        nullif(trim(k.display_name), ''),
        nullif(trim(p.name), ''),
        'Jugador'
      ) as display_name,
      k.koins,
      k.tournaments_played,
      k.updated_at
    from public.pt_community_tournament_koins k
    left join public.pt_user_profiles p on p.user_id = k.user_id
    where k.community_id = cid
      and k.tournaments_played >= 1
  ) x;

  return json_build_object('ok', true, 'community_id', cid, 'members', rows);
end;
$$;

revoke all on function public.pt_list_community_tournament_koins(text) from public;
grant execute on function public.pt_list_community_tournament_koins(text) to authenticated;

create or replace function public.pt_get_account_settings()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  prof public.pt_user_profiles;
  ent json;
  payments json;
  bonus json;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into prof from public.pt_user_profiles where user_id = uid;
  if not found then
    raise exception 'user_not_found';
  end if;

  ent := public.pt_build_entitlements_json(uid, true);

  select coalesce(json_agg(row_to_json(p) order by p.paid_at desc), '[]'::json)
  into payments
  from (
    select id, kind, description, amount_cents, currency, plan, pack_code,
           stripe_session_id, stripe_invoice_id, paid_at
    from public.pt_payment_ledger
    where user_id = uid
    order by paid_at desc
    limit 100
  ) p;

  select coalesce(json_agg(row_to_json(b) order by b.created_at desc), '[]'::json)
  into bonus
  from (
    select id, delta, balance_after, reason, pack_code, stripe_session_id, created_at
    from public.pt_ai_bonus_ledger
    where user_id = uid
    order by created_at desc
    limit 50
  ) b;

  return json_build_object(
    'profile', json_build_object(
      'user_id', prof.user_id,
      'email', prof.email,
      'name', prof.name,
      'tournament_alias', prof.tournament_alias,
      'plan', prof.plan,
      'is_admin', public.pt_profile_is_admin(prof),
      'is_founder', coalesce(prof.is_founder_study, false) or coalesce(prof.is_founder_coach, false) or coalesce(prof.is_founder, false),
      'is_founder_study', coalesce(prof.is_founder_study, false),
      'is_founder_coach', coalesce(prof.is_founder_coach, false),
      'founder_requested_at', prof.founder_requested_at,
      'founder_study_requested_at', prof.founder_study_requested_at,
      'founder_coach_requested_at', prof.founder_coach_requested_at,
      'subscription_status', prof.subscription_status,
      'subscription_period_end', prof.subscription_period_end,
      'billing_interval', prof.billing_interval,
      'subscription_cancel_at_period_end', prof.subscription_cancel_at_period_end,
      'stripe_customer_id', prof.stripe_customer_id,
      'stripe_subscription_id', prof.stripe_subscription_id,
      'stripe_last_payment_at', prof.stripe_last_payment_at,
      'created_at', prof.created_at,
      'last_seen_at', prof.last_seen_at
    ),
    'entitlements', ent,
    'payments', payments,
    'bonus_ledger', bonus
  );
end;
$$;

revoke all on function public.pt_get_account_settings() from public;
grant execute on function public.pt_get_account_settings() to authenticated;
