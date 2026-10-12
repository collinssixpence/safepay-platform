-- SafePay transaction schema for Supabase
-- Run this in the Supabase SQL Editor if the tables do not already exist.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer', 'seller')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.transaction_status as enum (
  'pending_payment',
  'payment_simulated',
  'seller_confirmed',
  'awaiting_delivery',
  'delivered',
  'completed',
  'cancelled',
  'disputed'
);

create type public.payment_method as enum (
  'EcoCash',
  'InnBucks',
  'Omari'
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_email text not null,
  seller_full_name text not null,
  seller_phone text not null,
  item_name text not null,
  item_description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  payment_method public.payment_method not null,
  status public.transaction_status not null default 'pending_payment',
  confirmation_code_hash text,
  payment_confirmed_at timestamptz,
  seller_confirmed_at timestamptz,
  confirmation_code_redeemed_at timestamptz,
  buyer_received_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_buyer_created_idx
  on public.transactions (buyer_id, created_at desc);

create index if not exists transactions_seller_status_idx
  on public.transactions (seller_email, status);

alter table public.transactions enable row level security;

create policy "Buyers can view their own transactions"
  on public.transactions for select
  using (auth.uid() = buyer_id);

create policy "Sellers can view intended transactions"
  on public.transactions for select
  using (lower(seller_email) = lower(auth.email()));

create policy "Buyers can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = buyer_id);

create policy "Buyers can update their own transactions"
  on public.transactions for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "Sellers can update assigned transactions"
  on public.transactions for update
  using (lower(seller_email) = lower(auth.email()))
  with check (lower(seller_email) = lower(auth.email()));

create policy "Users can delete their own cancelled transactions"
  on public.transactions for delete
  using (auth.uid() = buyer_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_transaction_updated_at
  before update on public.transactions
  for each row execute function public.update_updated_at_column();

-- Optional: keep profiles in sync with auth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- NOTE: This migration is intended for use with your live Supabase project.
-- If your existing database already contains these tables or columns, only apply the missing pieces.
