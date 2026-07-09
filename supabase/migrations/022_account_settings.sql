-- Historial de pagos y pantalla de configuración de cuenta.

create table if not exists public.pt_payment_ledger (
  id bigserial primary key,
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  kind text not null,
  description text,
  amount_cents int,
  currency text not null default 'eur',
  plan text,
  pack_code text,
  stripe_session_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists pt_payment_ledger_session_uidx
  on public.pt_payment_ledger (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists pt_payment_ledger_invoice_uidx
  on public.pt_payment_ledger (stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists pt_payment_ledger_user_idx
  on public.pt_payment_ledger (user_id, paid_at desc);

alter table public.pt_payment_ledger enable row level security;

drop policy if exists "payment_ledger_select_own" on public.pt_payment_ledger;
create policy "payment_ledger_select_own"
on public.pt_payment_ledger for select to authenticated
using (user_id = auth.uid()::text);

create or replace function public.pt_record_payment(
  p_user_id text,
  p_kind text,
  p_description text default null,
  p_amount_cents int default null,
  p_currency text default 'eur',
  p_plan text default null,
  p_pack_code text default null,
  p_stripe_session_id text default null,
  p_stripe_invoice_id text default null,
  p_stripe_payment_intent_id text default null,
  p_paid_at timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  paid timestamptz := coalesce(p_paid_at, timezone('utc', now()));
begin
  if p_user_id is null or p_user_id = '' then
    return json_build_object('ok', false, 'error', 'missing_user');
  end if;
  if p_kind is null or p_kind = '' then
    return json_build_object('ok', false, 'error', 'missing_kind');
  end if;

  if p_stripe_session_id is not null and exists (
    select 1 from public.pt_payment_ledger where stripe_session_id = p_stripe_session_id
  ) then
    return json_build_object('ok', true, 'duplicate', true);
  end if;

  if p_stripe_invoice_id is not null and exists (
    select 1 from public.pt_payment_ledger where stripe_invoice_id = p_stripe_invoice_id
  ) then
    return json_build_object('ok', true, 'duplicate', true);
  end if;

  insert into public.pt_payment_ledger (
    user_id, kind, description, amount_cents, currency, plan, pack_code,
    stripe_session_id, stripe_invoice_id, stripe_payment_intent_id, paid_at
  ) values (
    p_user_id, p_kind, p_description, p_amount_cents, lower(coalesce(p_currency, 'eur')),
    p_plan, p_pack_code, p_stripe_session_id, p_stripe_invoice_id,
    p_stripe_payment_intent_id, paid
  );

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.pt_record_payment(text, text, text, int, text, text, text, text, text, text, timestamptz) from public;
grant execute on function public.pt_record_payment(text, text, text, int, text, text, text, text, text, text, timestamptz) to service_role;

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
      'plan', prof.plan,
      'is_admin', public.pt_profile_is_admin(prof),
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
