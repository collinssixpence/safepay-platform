-- Add fields required by the current transaction flow to existing installations.
-- This migration is additive and does not change or disable existing RLS policies.

do $$
declare
  payment_method_type_kind "char";
  required_label text;
begin
  select typtype
    into payment_method_type_kind
    from pg_type
    where oid = to_regtype('public.payment_method');

  if payment_method_type_kind is null then
    execute 'create type public.payment_method as enum (''EcoCash'', ''InnBucks'', ''Omari'')';
  elsif payment_method_type_kind <> 'e' then
    raise exception 'public.payment_method exists but is not an enum; review the existing database type before applying this migration';
  else
    foreach required_label in array array['EcoCash', 'InnBucks', 'Omari'] loop
      if not exists (
        select 1
        from pg_enum
        where enumtypid = 'public.payment_method'::regtype
          and enumlabel = required_label
      ) then
        execute format('alter type public.payment_method add value %L', required_label);
      end if;
    end loop;
  end if;
end;
$$;

alter table public.transactions
  add column if not exists seller_full_name text,
  add column if not exists seller_phone text,
  add column if not exists item_name text,
  add column if not exists payment_method public.payment_method,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists seller_confirmed_at timestamptz,
  add column if not exists confirmation_code_redeemed_at timestamptz,
  add column if not exists buyer_received_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz;

do $$
declare
  existing_payment_method_type oid;
begin
  select atttypid
    into existing_payment_method_type
    from pg_attribute
    where attrelid = 'public.transactions'::regclass
      and attname = 'payment_method'
      and attnum > 0
      and not attisdropped;

  if existing_payment_method_type is not null
     and existing_payment_method_type <> 'public.payment_method'::regtype then
    raise exception 'transactions.payment_method has unexpected type %; review its values before applying this migration',
      format_type(existing_payment_method_type, null);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'confirmation_code_hash'
      and data_type <> 'text'
  ) then
    raise exception 'transactions.confirmation_code_hash is not text; review the existing column type before applying this migration';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'confirmation_code_hash'
  ) then
    raise exception 'transactions.confirmation_code_hash is missing; review the existing schema before applying this migration';
  end if;

  alter table public.transactions
    alter column confirmation_code_hash drop not null;
end;
$$;

create unique index if not exists transactions_confirmation_code_hash_uidx
  on public.transactions (confirmation_code_hash)
  where confirmation_code_hash is not null;