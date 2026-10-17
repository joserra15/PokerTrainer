-- Plantillas de mensajes de admin: CRUD + personalización de {nombre} al enviar.

create table if not exists public.pt_admin_message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subject text not null default '',
  body text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pt_admin_message_templates_title_chk check (length(trim(title)) >= 1 and length(title) <= 120),
  constraint pt_admin_message_templates_subject_chk check (length(subject) <= 200),
  constraint pt_admin_message_templates_body_chk check (length(body) <= 3000)
);

create index if not exists pt_admin_message_templates_active_idx
  on public.pt_admin_message_templates (is_active, sort_order asc, created_at desc);

alter table public.pt_admin_message_templates enable row level security;
-- Sin políticas de tabla: acceso solo vía RPCs security definer.

-- Sustituye {nombre} / {name} (y variantes con doble llave) por el primer nombre.
create or replace function public.pt_admin_message_personalize(p_text text, p_user_name text)
returns text
language plpgsql
immutable
as $$
declare
  out_text text := coalesce(p_text, '');
  first_name text;
begin
  first_name := split_part(trim(coalesce(p_user_name, '')), ' ', 1);
  if first_name = '' then
    first_name := 'jugador';
  end if;
  out_text := regexp_replace(out_text, '\{\{\s*nombre\s*\}\}', first_name, 'gi');
  out_text := regexp_replace(out_text, '\{\{\s*name\s*\}\}', first_name, 'gi');
  out_text := regexp_replace(out_text, '\{\s*nombre\s*\}', first_name, 'gi');
  out_text := regexp_replace(out_text, '\{\s*name\s*\}', first_name, 'gi');
  return out_text;
end;
$$;

revoke all on function public.pt_admin_message_personalize(text, text) from public;
grant execute on function public.pt_admin_message_personalize(text, text) to authenticated;

create or replace function public.pt_admin_list_message_templates()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rows json;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(json_agg(row_to_json(x) order by x.sort_order asc, x.created_at desc), '[]'::json)
  into rows
  from (
    select id, title, subject, body, sort_order, is_active, created_by, created_at, updated_at
    from public.pt_admin_message_templates
    order by sort_order asc, created_at desc
  ) x;

  return json_build_object('ok', true, 'templates', rows);
end;
$$;

revoke all on function public.pt_admin_list_message_templates() from public;
grant execute on function public.pt_admin_list_message_templates() to authenticated;

create or replace function public.pt_admin_create_message_template(
  p_title text,
  p_subject text default '',
  p_body text default '',
  p_sort_order int default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  t_title text := left(trim(coalesce(p_title, '')), 120);
  t_subject text := left(trim(coalesce(p_subject, '')), 200);
  t_body text := left(trim(coalesce(p_body, '')), 3000);
  t_sort int := coalesce(p_sort_order, 0);
  created public.pt_admin_message_templates%rowtype;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  if length(t_title) < 1 then
    raise exception 'title_required';
  end if;
  if length(t_body) < 1 then
    raise exception 'body_required';
  end if;

  insert into public.pt_admin_message_templates (
    title, subject, body, sort_order, is_active, created_by
  ) values (
    t_title, t_subject, t_body, t_sort, true, uid
  )
  returning * into created;

  return json_build_object(
    'ok', true,
    'template', json_build_object(
      'id', created.id,
      'title', created.title,
      'subject', created.subject,
      'body', created.body,
      'sort_order', created.sort_order,
      'is_active', created.is_active,
      'created_by', created.created_by,
      'created_at', created.created_at,
      'updated_at', created.updated_at
    )
  );
end;
$$;

revoke all on function public.pt_admin_create_message_template(text, text, text, int) from public;
grant execute on function public.pt_admin_create_message_template(text, text, text, int) to authenticated;

create or replace function public.pt_admin_update_message_template(
  p_id uuid,
  p_title text default null,
  p_subject text default null,
  p_body text default null,
  p_sort_order int default null,
  p_is_active boolean default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.pt_admin_message_templates%rowtype;
  t_title text;
  t_subject text;
  t_body text;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  select * into updated from public.pt_admin_message_templates where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;

  if p_title is not null then
    t_title := left(trim(p_title), 120);
    if length(t_title) < 1 then
      raise exception 'title_required';
    end if;
    updated.title := t_title;
  end if;
  if p_subject is not null then
    t_subject := left(trim(p_subject), 200);
    updated.subject := t_subject;
  end if;
  if p_body is not null then
    t_body := left(trim(p_body), 3000);
    if length(t_body) < 1 then
      raise exception 'body_required';
    end if;
    updated.body := t_body;
  end if;
  if p_sort_order is not null then
    updated.sort_order := p_sort_order;
  end if;
  if p_is_active is not null then
    updated.is_active := p_is_active;
  end if;
  updated.updated_at := timezone('utc', now());

  update public.pt_admin_message_templates
  set title = updated.title,
      subject = updated.subject,
      body = updated.body,
      sort_order = updated.sort_order,
      is_active = updated.is_active,
      updated_at = updated.updated_at
  where id = p_id;

  return json_build_object(
    'ok', true,
    'template', json_build_object(
      'id', updated.id,
      'title', updated.title,
      'subject', updated.subject,
      'body', updated.body,
      'sort_order', updated.sort_order,
      'is_active', updated.is_active,
      'created_by', updated.created_by,
      'created_at', updated.created_at,
      'updated_at', updated.updated_at
    )
  );
end;
$$;

revoke all on function public.pt_admin_update_message_template(uuid, text, text, text, int, boolean) from public;
grant execute on function public.pt_admin_update_message_template(uuid, text, text, text, int, boolean) to authenticated;

create or replace function public.pt_admin_delete_message_template(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.pt_admin_message_templates
  where id = p_id
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'not_found';
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_admin_delete_message_template(uuid) from public;
grant execute on function public.pt_admin_delete_message_template(uuid) to authenticated;

-- Envío admin: personaliza asunto/cuerpo por destinatario ({nombre} → primer nombre).
create or replace function public.pt_admin_contact_send(
  p_subject text,
  p_body text,
  p_target_mode text default 'single',
  p_user_ids text[] default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  subj text := left(trim(coalesce(p_subject, '')), 200);
  body text := left(trim(coalesce(p_body, '')), 3000);
  mode_text text := lower(trim(coalesce(p_target_mode, 'single')));
  sent_count int := 0;
begin
  if not public.is_pt_admin() then
    raise exception 'forbidden';
  end if;
  if length(subj) < 3 then
    raise exception 'subject_too_short';
  end if;
  if length(body) < 5 then
    raise exception 'body_too_short';
  end if;
  if mode_text not in ('single', 'multiple', 'all') then
    raise exception 'invalid_target_mode';
  end if;

  with recipients as (
    select p.user_id, p.email, p.name
    from public.pt_user_profiles p
    where p.user_id <> uid
      and p.user_id <> 'pt_demo_user'
      and (
        mode_text = 'all'
        or p.user_id = any(coalesce(p_user_ids, array[]::text[]))
      )
  ), created_threads as (
    insert into public.pt_contact_threads (
      user_id, user_email, user_name, subject, admin_unread_count, user_unread_count, status
    )
    select
      r.user_id,
      r.email,
      r.name,
      left(public.pt_admin_message_personalize(subj, r.name), 200),
      0,
      1,
      'open'
    from recipients r
    returning id, user_id
  ), created_messages as (
    insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
    select
      t.id,
      'admin',
      uid,
      left(public.pt_admin_message_personalize(body, r.name), 3000)
    from created_threads t
    join recipients r on r.user_id = t.user_id
    returning thread_id
  )
  select count(*)::int into sent_count
  from created_messages;

  if sent_count <= 0 then
    raise exception 'no_recipients';
  end if;

  return json_build_object('ok', true, 'sent_count', sent_count);
end;
$$;

revoke all on function public.pt_admin_contact_send(text, text, text, text[]) from public;
grant execute on function public.pt_admin_contact_send(text, text, text, text[]) to authenticated;

-- Respuesta admin: personaliza {nombre} con el nombre del hilo.
create or replace function public.pt_admin_contact_reply(
  p_thread_id uuid,
  p_body text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  body text;
  uname text;
begin
  if not public.is_pt_admin() then raise exception 'forbidden'; end if;
  body := left(trim(coalesce(p_body, '')), 3000);
  if length(body) < 1 then raise exception 'body_empty'; end if;

  select user_name into uname from public.pt_contact_threads where id = p_thread_id;
  if not found then
    raise exception 'thread_not_found';
  end if;

  body := left(public.pt_admin_message_personalize(body, uname), 3000);

  insert into public.pt_contact_messages (thread_id, sender_role, sender_id, body)
  values (p_thread_id, 'admin', uid, body);

  update public.pt_contact_threads
  set user_unread_count = user_unread_count + 1,
      admin_unread_count = 0,
      last_message_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_thread_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_admin_contact_reply(uuid, text) from public;
grant execute on function public.pt_admin_contact_reply(uuid, text) to authenticated;

-- Semillas iniciales (solo si la tabla está vacía).
insert into public.pt_admin_message_templates (title, subject, body, sort_order, is_active)
select *
from (
  values
    (
      'Saludo de bienvenida',
      'Bienvenido a PokerForgeAI',
      E'Hola {nombre},\n\nBienvenido a PokerForgeAI. Si tienes cualquier duda sobre el entrenador, la importación de sesiones o ForgeCoach, responde a este mensaje y te ayudamos.\n\nUn saludo,\nEl equipo de PokerForgeAI',
      10,
      true
    ),
    (
      'Recordatorio de actividad',
      'Te echamos de menos en el felt',
      E'Hola {nombre},\n\nHace un tiempo que no te vemos entrenar. Cuando quieras retomar, el entrenador y ForgeCoach están listos para seguir contigo.\n\nUn saludo,\nEl equipo de PokerForgeAI',
      20,
      true
    ),
    (
      'Aviso / mantenimiento',
      'Aviso importante',
      E'Hola {nombre},\n\nQueremos informarte de un aviso importante sobre la plataforma. Si necesitas más detalle, responde a este mensaje.\n\nUn saludo,\nEl equipo de PokerForgeAI',
      30,
      true
    )
) as seed(title, subject, body, sort_order, is_active)
where not exists (select 1 from public.pt_admin_message_templates limit 1);
