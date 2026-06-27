-- Registrar último pago Stripe por customer_id o user_id (fallback si falta enlace).

drop function if exists public.pt_record_stripe_payment(text, timestamptz);

create or replace function public.pt_record_stripe_payment(
  p_stripe_customer_id text default null,
  p_paid_at timestamptz default now(),
  p_user_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz := coalesce(p_paid_at, timezone('utc', now()));
begin
  if p_stripe_customer_id is not null and p_stripe_customer_id <> '' then
    update public.pt_user_profiles
    set
      stripe_last_payment_at = greatest(coalesce(stripe_last_payment_at, 'epoch'::timestamptz), ts),
      stripe_customer_id = coalesce(stripe_customer_id, p_stripe_customer_id)
    where stripe_customer_id = p_stripe_customer_id;
  end if;

  if p_user_id is not null and p_user_id <> '' then
    update public.pt_user_profiles
    set stripe_last_payment_at = greatest(coalesce(stripe_last_payment_at, 'epoch'::timestamptz), ts)
    where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.pt_record_stripe_payment(text, timestamptz, text) from public;
