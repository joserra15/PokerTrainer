-- Códigos de acceso de un solo uso para comunidades (MTT LAB).
-- Sustituye el join_code compartido reutilizable por invites one-time canjeables
-- tras el pago en plataforma externa. Manager genera/lista/invalida; canje público
-- autenticado; revocación de miembro fuerza plan free en PokerForgeAI.

create table if not exists public.pt_community_invite_codes (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references public.pt_communities(id) on delete cascade,
  code text not null,
  status text not null default 'unused'
    check (status in ('unused', 'used', 'revoked')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  created_by text,
  used_at timestamptz,
  used_by text references public.pt_user_profiles(user_id) on delete set null,
  constraint pt_community_invite_codes_code_unique unique (code)
);

create index if not exists pt_community_invite_codes_community_status_idx
  on public.pt_community_invite_codes (community_id, status, created_at desc);

create index if not exists pt_community_invite_codes_used_by_idx
  on public.pt_community_invite_codes (used_by)
  where used_by is not null;

alter table public.pt_community_invite_codes enable row level security;
-- Sin políticas de tabla: acceso solo vía RPCs security definer.

-- Desactivar join_code compartido de MTT LAB (canje público solo vía invites).
update public.pt_communities
set join_code = null
where id = 'mttlab';

create or replace function public.pt_invite_normalize_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(trim(coalesce(p_code, '')));
$$;

create or replace function public.pt_invite_new_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (
      select 1 from public.pt_community_invite_codes c where c.code = candidate
    );
    if attempts > 20 then
      raise exception 'code_gen_failed';
    end if;
  end loop;
  return candidate;
end;
$$;

-- Manager: generar lote de códigos one-time
create or replace function public.pt_manager_generate_invite_codes(
  p_community_id text,
  p_count int default 10,
  p_note text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  n int := greatest(1, least(coalesce(p_count, 10), 200));
  note_v text := left(trim(coalesce(p_note, '')), 200);
  i int;
  new_id uuid;
  new_code text;
  created jsonb := '[]'::jsonb;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.pt_communities where id = p_community_id and active) then
    return json_build_object('ok', false, 'error', 'unknown_community');
  end if;

  for i in 1..n loop
    new_code := public.pt_invite_new_code();
    insert into public.pt_community_invite_codes (
      community_id, code, status, note, created_by
    ) values (
      p_community_id, new_code, 'unused', note_v, uid
    )
    returning id into new_id;

    created := created || jsonb_build_array(jsonb_build_object(
      'id', new_id,
      'code', new_code,
      'status', 'unused',
      'note', note_v,
      'created_by', uid
    ));
  end loop;

  return json_build_object(
    'ok', true,
    'community_id', p_community_id,
    'count', n,
    'codes', created
  );
end;
$$;

revoke all on function public.pt_manager_generate_invite_codes(text, int, text) from public;
grant execute on function public.pt_manager_generate_invite_codes(text, int, text) to authenticated;

-- Manager: listar códigos (opcional filtro por status)
create or replace function public.pt_manager_list_invite_codes(
  p_community_id text,
  p_status text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  status_v text := lower(trim(coalesce(p_status, '')));
  rows json;
  unused_n int;
  used_n int;
  revoked_n int;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;
  if status_v <> '' and status_v not in ('unused', 'used', 'revoked') then
    return json_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select coalesce(json_agg(row_to_json(x) order by x.created_at desc), '[]'::json)
  into rows
  from (
    select
      c.id,
      c.code,
      c.status,
      c.note,
      c.created_at,
      c.created_by,
      c.used_at,
      c.used_by,
      p.email as used_by_email,
      p.name as used_by_name
    from public.pt_community_invite_codes c
    left join public.pt_user_profiles p on p.user_id = c.used_by
    where c.community_id = p_community_id
      and (status_v = '' or c.status = status_v)
    order by c.created_at desc
    limit 2000
  ) x;

  select
    count(*) filter (where status = 'unused')::int,
    count(*) filter (where status = 'used')::int,
    count(*) filter (where status = 'revoked')::int
  into unused_n, used_n, revoked_n
  from public.pt_community_invite_codes
  where community_id = p_community_id;

  return json_build_object(
    'ok', true,
    'community_id', p_community_id,
    'codes', rows,
    'summary', json_build_object(
      'unused', coalesce(unused_n, 0),
      'used', coalesce(used_n, 0),
      'revoked', coalesce(revoked_n, 0)
    )
  );
end;
$$;

revoke all on function public.pt_manager_list_invite_codes(text, text) from public;
grant execute on function public.pt_manager_list_invite_codes(text, text) to authenticated;

-- Manager: invalidar código no usado
create or replace function public.pt_manager_invalidate_invite_code(
  p_community_id text,
  p_code_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row_c public.pt_community_invite_codes;
begin
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;

  select * into row_c
  from public.pt_community_invite_codes
  where id = p_code_id
    and community_id = p_community_id
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  if row_c.status <> 'unused' then
    return json_build_object('ok', false, 'error', 'not_unused', 'status', row_c.status);
  end if;

  update public.pt_community_invite_codes
  set status = 'revoked'
  where id = row_c.id;

  return json_build_object(
    'ok', true,
    'id', row_c.id,
    'code', row_c.code,
    'status', 'revoked'
  );
end;
$$;

revoke all on function public.pt_manager_invalidate_invite_code(text, uuid) from public;
grant execute on function public.pt_manager_invalidate_invite_code(text, uuid) to authenticated;

-- Canje público autenticado: un solo uso, asocia al usuario
create or replace function public.pt_redeem_community_invite(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  code text := public.pt_invite_normalize_code(p_code);
  inv public.pt_community_invite_codes;
  comm public.pt_communities;
  already_active boolean := false;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select * into inv
  from public.pt_community_invite_codes
  where pt_community_invite_codes.code = code
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select * into comm
  from public.pt_communities
  where id = inv.community_id
    and active = true;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select exists (
    select 1
    from public.pt_community_members m
    where m.user_id = uid
      and m.community_id = inv.community_id
      and m.status = 'active'
  ) into already_active;

  if already_active then
    return json_build_object(
      'ok', true,
      'already_member', true,
      'community_id', inv.community_id,
      'name', comm.name
    );
  end if;

  if inv.status = 'used' then
    return json_build_object('ok', false, 'error', 'already_used');
  end if;
  if inv.status = 'revoked' then
    return json_build_object('ok', false, 'error', 'revoked');
  end if;
  if inv.status <> 'unused' then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  update public.pt_community_invite_codes
  set
    status = 'used',
    used_by = uid,
    used_at = timezone('utc', now())
  where id = inv.id
    and status = 'unused';

  if not found then
    return json_build_object('ok', false, 'error', 'already_used');
  end if;

  insert into public.pt_community_members (
    user_id, community_id, role, status, granted_by, granted_at, revoked_at
  ) values (
    uid, inv.community_id, 'member', 'active', 'invite_code',
    timezone('utc', now()), null
  )
  on conflict (user_id, community_id) do update set
    status = 'active',
    revoked_at = null,
    granted_at = timezone('utc', now()),
    granted_by = 'invite_code',
    role = case
      when public.pt_community_members.role = 'manager' then 'manager'
      else 'member'
    end;

  return json_build_object(
    'ok', true,
    'community_id', inv.community_id,
    'name', comm.name,
    'code', code,
    'granted_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.pt_redeem_community_invite(text) from public;
grant execute on function public.pt_redeem_community_invite(text) to authenticated;

-- Manager: revocar miembro → membership revoked + plan free PokerForgeAI
create or replace function public.pt_manager_revoke_member(
  p_community_id text,
  p_user_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := auth.uid()::text;
  target text := trim(coalesce(p_user_id, ''));
  resolved_uid text;
  mem public.pt_community_members;
begin
  if actor is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.pt_is_community_manager(p_community_id) then
    raise exception 'forbidden';
  end if;
  if target = '' then
    return json_build_object('ok', false, 'error', 'missing_user');
  end if;

  resolved_uid := target;
  if not exists (
    select 1 from public.pt_community_members
    where community_id = p_community_id and user_id = resolved_uid
  ) then
    select p.user_id into resolved_uid
    from public.pt_user_profiles p
    join public.pt_community_members m on m.user_id = p.user_id
    where m.community_id = p_community_id
      and lower(p.email) = lower(target)
    limit 1;
  end if;

  if resolved_uid is null or resolved_uid = '' then
    return json_build_object('ok', false, 'error', 'not_a_member');
  end if;
  if resolved_uid = actor then
    return json_build_object('ok', false, 'error', 'cannot_revoke_self');
  end if;

  select * into mem
  from public.pt_community_members
  where community_id = p_community_id
    and user_id = resolved_uid
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'not_a_member');
  end if;

  if mem.status = 'revoked' then
    -- Idempotente: asegurar plan free igualmente
    update public.pt_user_profiles
    set
      plan = 'free',
      subscription_status = 'none',
      subscription_period_end = null,
      billing_interval = null,
      stripe_subscription_id = null,
      ai_monthly_limit = null
    where user_id = mem.user_id;

    return json_build_object(
      'ok', true,
      'already_revoked', true,
      'user_id', mem.user_id,
      'community_id', p_community_id,
      'plan', 'free'
    );
  end if;

  update public.pt_community_members
  set
    status = 'revoked',
    revoked_at = timezone('utc', now())
  where user_id = mem.user_id
    and community_id = p_community_id;

  update public.pt_user_profiles
  set
    plan = 'free',
    subscription_status = 'none',
    subscription_period_end = null,
    billing_interval = null,
    stripe_subscription_id = null,
    ai_monthly_limit = null
  where user_id = mem.user_id;

  return json_build_object(
    'ok', true,
    'user_id', mem.user_id,
    'community_id', p_community_id,
    'status', 'revoked',
    'plan', 'free',
    'revoked_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.pt_manager_revoke_member(text, text) from public;
grant execute on function public.pt_manager_revoke_member(text, text) to authenticated;

-- pt_join_community: dejar de aceptar join_code compartido; redirigir a invites.
-- Mantiene la firma por compatibilidad; el cliente usa pt_redeem_community_invite.
create or replace function public.pt_join_community(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.pt_redeem_community_invite(p_code);
end;
$$;

revoke all on function public.pt_join_community(text) from public;
grant execute on function public.pt_join_community(text) to authenticated;
