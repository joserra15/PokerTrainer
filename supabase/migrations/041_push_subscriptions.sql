-- Web Push: suscripciones por dispositivo (móvil + PC) y limpieza de endpoints muertos.

create table if not exists public.pt_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text not null default 'unknown'
    check (platform in ('android', 'ios', 'desktop', 'unknown')),
  enabled boolean not null default true,
  last_error text,
  last_sent_at timestamptz,
  last_campaign text,
  last_campaign_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (endpoint)
);

create index if not exists pt_push_subscriptions_user_idx
  on public.pt_push_subscriptions (user_id)
  where enabled = true;

create index if not exists pt_push_subscriptions_campaign_idx
  on public.pt_push_subscriptions (user_id, last_campaign, last_campaign_at);

alter table public.pt_push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.pt_push_subscriptions;
create policy "push_subscriptions_select_own"
on public.pt_push_subscriptions for select to authenticated
using (user_id = auth.uid()::text);

drop policy if exists "push_subscriptions_insert_own" on public.pt_push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.pt_push_subscriptions for insert to authenticated
with check (user_id = auth.uid()::text);

drop policy if exists "push_subscriptions_update_own" on public.pt_push_subscriptions;
create policy "push_subscriptions_update_own"
on public.pt_push_subscriptions for update to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists "push_subscriptions_delete_own" on public.pt_push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.pt_push_subscriptions for delete to authenticated
using (user_id = auth.uid()::text);

grant select, insert, update, delete on public.pt_push_subscriptions to authenticated;
grant all on public.pt_push_subscriptions to service_role;

create or replace function public.pt_push_touch_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists pt_push_subscriptions_touch on public.pt_push_subscriptions;
create trigger pt_push_subscriptions_touch
before update on public.pt_push_subscriptions
for each row execute procedure public.pt_push_touch_updated();
