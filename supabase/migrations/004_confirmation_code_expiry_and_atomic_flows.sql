alter table public.transactions
  add column if not exists confirmation_code_expires_at timestamptz;

alter table public.transactions
  alter column confirmation_code_expires_at
  set default (statement_timestamp() + interval '15 minutes');

update public.transactions
set confirmation_code_expires_at = statement_timestamp()
where confirmation_code_hash is not null
  and confirmation_code_expires_at is null;

create or replace function public.verify_transaction_confirmation_code(
  p_confirmation_code_hash text
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  verified_transaction_id uuid;
  matching_status text;
  matching_redeemed_at timestamptz;
  matching_expires_at timestamptz;
begin
  if auth.uid() is null
     or auth.email() is null
     or not exists (
       select 1
       from public.profiles
       where id = auth.uid()
         and role = 'seller'
     ) then
    return 'invalid';
  end if;

  update public.transactions
  set status = 'awaiting_delivery',
      seller_confirmed_at = statement_timestamp(),
      confirmation_code_redeemed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where confirmation_code_hash = p_confirmation_code_hash
    and lower(seller_email) = lower(auth.email())
    and status = 'payment_simulated'
    and confirmation_code_redeemed_at is null
    and confirmation_code_expires_at > statement_timestamp()
  returning id into verified_transaction_id;

  if found then
    return 'verified';
  end if;

  select status::text, confirmation_code_redeemed_at, confirmation_code_expires_at
  into matching_status, matching_redeemed_at, matching_expires_at
  from public.transactions
  where confirmation_code_hash = p_confirmation_code_hash
    and lower(seller_email) = lower(auth.email());

  if not found then
    return 'invalid';
  end if;

  if matching_redeemed_at is not null then
    return 'already_used';
  end if;

  if matching_expires_at is null
     or matching_expires_at <= statement_timestamp() then
    return 'expired';
  end if;

  return 'ineligible';
end;
$$;

create or replace function public.regenerate_transaction_confirmation_code(
  p_transaction_id uuid,
  p_confirmation_code_hash text
)
returns table(outcome text, expires_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  new_expiry timestamptz;
  current_status text;
  current_redeemed_at timestamptz;
  current_expiry timestamptz;
begin
  if auth.uid() is null
     or not exists (
       select 1
       from public.profiles
       where id = auth.uid()
         and role = 'buyer'
     ) then
    return query select 'not_found'::text, null::timestamptz;
    return;
  end if;

  update public.transactions
  set confirmation_code_hash = p_confirmation_code_hash,
      confirmation_code_expires_at = statement_timestamp() + interval '15 minutes',
      updated_at = statement_timestamp()
  where id = p_transaction_id
    and buyer_id = auth.uid()
    and status in ('pending_payment', 'payment_simulated')
    and confirmation_code_redeemed_at is null
    and (confirmation_code_expires_at is null
      or confirmation_code_expires_at <= statement_timestamp())
  returning confirmation_code_expires_at into new_expiry;

  if found then
    return query select 'generated'::text, new_expiry;
    return;
  end if;

  select status::text, confirmation_code_redeemed_at, confirmation_code_expires_at
  into current_status, current_redeemed_at, current_expiry
  from public.transactions
  where id = p_transaction_id
    and buyer_id = auth.uid();

  if not found then
    return query select 'not_found'::text, null::timestamptz;
  elsif current_status not in ('pending_payment', 'payment_simulated')
     or current_redeemed_at is not null then
    return query select 'ineligible'::text, current_expiry;
  elsif current_expiry > statement_timestamp() then
    return query select 'not_expired'::text, current_expiry;
  else
    return query select 'ineligible'::text, current_expiry;
  end if;
end;
$$;

revoke all on function public.verify_transaction_confirmation_code(text) from public, anon;
revoke all on function public.regenerate_transaction_confirmation_code(uuid, text) from public, anon;
grant execute on function public.verify_transaction_confirmation_code(text) to authenticated;
grant execute on function public.regenerate_transaction_confirmation_code(uuid, text) to authenticated;

notify pgrst, 'reload schema';