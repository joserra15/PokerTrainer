-- Recuento de Koins desde histórico de uso.
-- Partida en 0 (sin endowment de 100). Excluye administradores.
-- Manager(s) de MTTLab → 100 Koins en esa comunidad.
-- Actualiza pt_user_state.payload (tournamentWallet*) y pt_community_tournament_koins.

alter table public.pt_community_tournament_koins
  alter column koins set default 0;

create or replace function public.pt_compute_tournament_koins_from_payload(
  p_payload jsonb,
  p_community_id text default 'pokerforge'
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  cid text := lower(trim(coalesce(nullif(p_community_id, ''), 'pokerforge')));
  suffix text := case when cid = 'pokerforge' then '' else '_' || cid end;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  wallet jsonb;
  history jsonb;
  stats jsonb;
  school jsonb;
  active jsonb;
  lessons_wallet int := 0;
  lessons_school int := 0;
  lessons int := 0;
  trainer_hands numeric := 0;
  trainer_koins numeric := 0;
  tournament_net numeric := 0;
  role_koins numeric := 0;
  active_hold numeric := 0;
  played int := 0;
  hist_n int := 0;
  row_item jsonb;
  buy_in numeric;
  prize numeric;
  profit numeric;
  bal numeric;
begin
  wallet := payload -> ('tournamentWallet' || suffix);
  if wallet is null or jsonb_typeof(wallet) <> 'object' then
    wallet := '{}'::jsonb;
  end if;

  history := payload -> ('tournamentHistory' || suffix);
  if history is null or jsonb_typeof(history) <> 'array' then
    history := '[]'::jsonb;
  end if;

  if suffix = '' then
    stats := coalesce(payload -> 'stats', '{}'::jsonb);
    school := coalesce(stats -> 'school', '{}'::jsonb);
  else
    stats := coalesce(payload -> ('stats' || suffix), '{}'::jsonb);
    school := coalesce(
      payload -> ('school' || suffix),
      stats -> 'school',
      '{}'::jsonb
    );
  end if;

  active := payload -> ('tournamentActive' || suffix);
  if active is not null and jsonb_typeof(active) = 'object' and nullif(active->>'id', '') is not null then
    active_hold := greatest(
      0,
      coalesce(
        nullif(active #>> '{config,buyInEur}', '')::numeric,
        nullif(active #>> '{config,buyIn}', '')::numeric,
        nullif(active->>'buyInEur', '')::numeric,
        nullif(active->>'buyIn', '')::numeric,
        0
      )
    );
  end if;

  select count(*)::int into lessons_wallet
  from jsonb_each(coalesce(wallet -> 'lessonAwards', '{}'::jsonb)) kv
  where kv.value is not null and kv.value::text not in ('null', 'false', '""', '0');

  select count(*)::int into lessons_school
  from jsonb_each(coalesce(school -> 'lessons', '{}'::jsonb)) kv
  where coalesce((kv.value ->> 'passed')::boolean, false);

  lessons := greatest(lessons_wallet, lessons_school);

  trainer_hands := greatest(
    coalesce(nullif(wallet->>'trainerHands', '')::numeric, 0),
    coalesce(nullif(stats->>'handsPlayed', '')::numeric, 0)
  );
  trainer_koins := floor(trainer_hands / 25.0);

  for row_item in select value from jsonb_array_elements(history)
  loop
    if row_item is null or jsonb_typeof(row_item) <> 'object' then
      continue;
    end if;
    hist_n := hist_n + 1;
    buy_in := coalesce(nullif(row_item->>'buyInEur', '')::numeric, 0);
    prize := coalesce(nullif(row_item->>'prizeEur', '')::numeric, 0);
    if row_item ? 'profit' and nullif(row_item->>'profit', '') is not null then
      profit := (row_item->>'profit')::numeric;
    else
      profit := prize - buy_in;
    end if;
    tournament_net := tournament_net + profit;

    if row_item ? 'roleKoins' and nullif(row_item->>'roleKoins', '') is not null then
      role_koins := role_koins + greatest(0, (row_item->>'roleKoins')::numeric);
    elsif row_item ? 'roleCorrect' and nullif(row_item->>'roleCorrect', '') is not null then
      role_koins := role_koins + greatest(0, floor((row_item->>'roleCorrect')::numeric) * 2);
    end if;
  end loop;

  played := greatest(
    hist_n,
    coalesce(nullif(wallet->>'tournamentsPlayed', '')::int, 0)
  );

  bal := greatest(0, round((0 + lessons + trainer_koins + tournament_net + role_koins - active_hold) * 100) / 100);

  return jsonb_build_object(
    'balance', bal,
    'starting', 0,
    'lessons', lessons,
    'trainerHands', trainer_hands,
    'trainerKoins', trainer_koins,
    'tournamentNet', round(tournament_net * 100) / 100,
    'roleKoins', round(role_koins * 100) / 100,
    'activeHold', round(active_hold * 100) / 100,
    'tournamentsPlayed', played,
    'lessonAwards', coalesce(wallet -> 'lessonAwards', '{}'::jsonb),
    'communityId', cid
  );
end;
$$;

revoke all on function public.pt_compute_tournament_koins_from_payload(jsonb, text) from public;
grant execute on function public.pt_compute_tournament_koins_from_payload(jsonb, text) to authenticated;

create or replace function public.pt_admin_recompute_tournament_koins()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  u record;
  cid text;
  communities text[];
  computed jsonb;
  bal numeric;
  played int;
  suffix text;
  wallet_key text;
  new_wallet jsonb;
  payload jsonb;
  uname text;
  updated_users int := 0;
  updated_wallets int := 0;
  skipped_admins int := 0;
  manager_grants int := 0;
  is_mgr boolean;
begin
  if uid is null or not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(array_agg(distinct x.cid), array['pokerforge'::text])
  into communities
  from (
    select 'pokerforge'::text as cid
    union
    select lower(trim(community_id)) from public.pt_community_members
    where nullif(trim(community_id), '') is not null
  ) x;

  for u in
    select p.user_id, p.email, p.name, p.is_admin,
           coalesce(s.payload, '{}'::jsonb) as payload
    from public.pt_user_profiles p
    left join public.pt_user_state s on s.user_id = p.user_id
  loop
    if coalesce(u.is_admin, false) then
      skipped_admins := skipped_admins + 1;
      continue;
    end if;

    payload := u.payload;
    updated_users := updated_users + 1;

    foreach cid in array communities
    loop
      suffix := case when cid = 'pokerforge' then '' else '_' || cid end;
      wallet_key := 'tournamentWallet' || suffix;

      is_mgr := false;
      if cid = 'mttlab' then
        select exists (
          select 1 from public.pt_community_members m
          where m.community_id = 'mttlab'
            and m.user_id = u.user_id
            and m.status = 'active'
            and m.role = 'manager'
        ) into is_mgr;
      end if;

      if is_mgr then
        bal := 100;
        played := greatest(
          coalesce(nullif(payload #>> array[wallet_key, 'tournamentsPlayed'], '')::int, 0),
          coalesce(jsonb_array_length(coalesce(payload -> ('tournamentHistory' || suffix), '[]'::jsonb)), 0)
        );
        manager_grants := manager_grants + 1;
        computed := jsonb_build_object(
          'balance', bal,
          'starting', 0,
          'tournamentsPlayed', played,
          'lessonAwards', coalesce(payload #> array[wallet_key, 'lessonAwards'], '{}'::jsonb),
          'trainerHands', coalesce(nullif(payload #>> array[wallet_key, 'trainerHands'], '')::numeric, 0),
          'forced', true
        );
      else
        /* Solo tocar comunidades con rastro de actividad o wallet/histórico. */
        if cid <> 'pokerforge'
           and not exists (
             select 1 from public.pt_community_members m
             where m.community_id = cid and m.user_id = u.user_id and m.status = 'active'
           )
           and payload -> wallet_key is null
           and payload -> ('tournamentHistory' || suffix) is null
           and payload -> ('stats' || suffix) is null
           and payload -> ('school' || suffix) is null
        then
          continue;
        end if;

        computed := public.pt_compute_tournament_koins_from_payload(payload, cid);
        bal := coalesce((computed->>'balance')::numeric, 0);
        played := coalesce((computed->>'tournamentsPlayed')::int, 0);
      end if;

      new_wallet := jsonb_build_object(
        'balance', bal,
        'updatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'version', greatest(1, coalesce(nullif(payload #>> array[wallet_key, 'version'], '')::int, 1)),
        'trainerHands', coalesce((computed->>'trainerHands')::numeric, 0),
        'tournamentsPlayed', played,
        'lessonAwards', coalesce(computed -> 'lessonAwards', '{}'::jsonb),
        'last', jsonb_build_object(
          'type', 'koins_recompute',
          'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'forced', coalesce((computed->>'forced')::boolean, false),
          'lessons', computed -> 'lessons',
          'trainerKoins', computed -> 'trainerKoins',
          'tournamentNet', computed -> 'tournamentNet',
          'roleKoins', computed -> 'roleKoins',
          'activeHold', computed -> 'activeHold'
        )
      );

      payload := jsonb_set(payload, array[wallet_key], new_wallet, true);
      updated_wallets := updated_wallets + 1;

      select coalesce(nullif(trim(u.name), ''), nullif(trim(u.email), ''), 'Jugador')
        into uname;

      insert into public.pt_community_tournament_koins as t
        (community_id, user_id, display_name, koins, tournaments_played, updated_at)
      values (cid, u.user_id, uname, bal, played, now())
      on conflict (community_id, user_id) do update
        set koins = excluded.koins,
            display_name = excluded.display_name,
            tournaments_played = excluded.tournaments_played,
            updated_at = now();
    end loop;

    insert into public.pt_user_state (user_id, payload, updated_at)
    values (u.user_id, payload, now())
    on conflict (user_id) do update
      set payload = excluded.payload,
          updated_at = now();
  end loop;

  return jsonb_build_object(
    'ok', true,
    'updated_users', updated_users,
    'updated_wallets', updated_wallets,
    'skipped_admins', skipped_admins,
    'manager_grants', manager_grants,
    'communities', to_jsonb(communities)
  );
end;
$$;

revoke all on function public.pt_admin_recompute_tournament_koins() from public;
grant execute on function public.pt_admin_recompute_tournament_koins() to authenticated;

-- Ejecutar el recuento una vez al aplicar la migración (como service role / owner).
do $$
declare
  u record;
  cid text;
  communities text[];
  computed jsonb;
  bal numeric;
  played int;
  suffix text;
  wallet_key text;
  new_wallet jsonb;
  payload jsonb;
  uname text;
  is_mgr boolean;
begin
  select coalesce(array_agg(distinct x.cid), array['pokerforge'::text])
  into communities
  from (
    select 'pokerforge'::text as cid
    union
    select lower(trim(community_id)) from public.pt_community_members
    where nullif(trim(community_id), '') is not null
  ) x;

  for u in
    select p.user_id, p.email, p.name, p.is_admin,
           coalesce(s.payload, '{}'::jsonb) as payload
    from public.pt_user_profiles p
    left join public.pt_user_state s on s.user_id = p.user_id
  loop
    if coalesce(u.is_admin, false) then
      continue;
    end if;

    payload := u.payload;

    foreach cid in array communities
    loop
      suffix := case when cid = 'pokerforge' then '' else '_' || cid end;
      wallet_key := 'tournamentWallet' || suffix;

      is_mgr := false;
      if cid = 'mttlab' then
        select exists (
          select 1 from public.pt_community_members m
          where m.community_id = 'mttlab'
            and m.user_id = u.user_id
            and m.status = 'active'
            and m.role = 'manager'
        ) into is_mgr;
      end if;

      if is_mgr then
        bal := 100;
        played := greatest(
          coalesce(nullif(payload #>> array[wallet_key, 'tournamentsPlayed'], '')::int, 0),
          coalesce(jsonb_array_length(coalesce(payload -> ('tournamentHistory' || suffix), '[]'::jsonb)), 0)
        );
        computed := jsonb_build_object(
          'balance', bal,
          'tournamentsPlayed', played,
          'lessonAwards', coalesce(payload #> array[wallet_key, 'lessonAwards'], '{}'::jsonb),
          'trainerHands', coalesce(nullif(payload #>> array[wallet_key, 'trainerHands'], '')::numeric, 0),
          'forced', true
        );
      else
        if cid <> 'pokerforge'
           and not exists (
             select 1 from public.pt_community_members m
             where m.community_id = cid and m.user_id = u.user_id and m.status = 'active'
           )
           and payload -> wallet_key is null
           and payload -> ('tournamentHistory' || suffix) is null
           and payload -> ('stats' || suffix) is null
           and payload -> ('school' || suffix) is null
        then
          continue;
        end if;

        computed := public.pt_compute_tournament_koins_from_payload(payload, cid);
        bal := coalesce((computed->>'balance')::numeric, 0);
        played := coalesce((computed->>'tournamentsPlayed')::int, 0);
      end if;

      new_wallet := jsonb_build_object(
        'balance', bal,
        'updatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'version', greatest(1, coalesce(nullif(payload #>> array[wallet_key, 'version'], '')::int, 1)),
        'trainerHands', coalesce((computed->>'trainerHands')::numeric, 0),
        'tournamentsPlayed', played,
        'lessonAwards', coalesce(computed -> 'lessonAwards', '{}'::jsonb),
        'last', jsonb_build_object(
          'type', 'koins_recompute',
          'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'forced', coalesce((computed->>'forced')::boolean, false)
        )
      );

      payload := jsonb_set(payload, array[wallet_key], new_wallet, true);

      select coalesce(nullif(trim(u.name), ''), nullif(trim(u.email), ''), 'Jugador')
        into uname;

      insert into public.pt_community_tournament_koins as t
        (community_id, user_id, display_name, koins, tournaments_played, updated_at)
      values (cid, u.user_id, uname, bal, played, now())
      on conflict (community_id, user_id) do update
        set koins = excluded.koins,
            display_name = excluded.display_name,
            tournaments_played = excluded.tournaments_played,
            updated_at = now();
    end loop;

    insert into public.pt_user_state (user_id, payload, updated_at)
    values (u.user_id, payload, now())
    on conflict (user_id) do update
      set payload = excluded.payload,
          updated_at = now();
  end loop;
end;
$$;
