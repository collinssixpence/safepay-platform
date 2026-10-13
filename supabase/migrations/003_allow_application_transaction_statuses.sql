-- Preserve every status accepted by the existing check and add every status
-- declared by the application transaction type and initial schema.
do $$
declare
  existing_status_check text;
begin
  select pg_get_expr(con.conbin, con.conrelid)
    into existing_status_check
    from pg_constraint con
    where con.conrelid = 'public.transactions'::regclass
      and con.conname = 'transactions_status_check'
      and con.contype = 'c';

  if existing_status_check is null then
    raise exception 'Expected check constraint public.transactions_status_check was not found; review the database schema before applying this migration';
  end if;

  execute 'alter table public.transactions drop constraint transactions_status_check';
  execute format(
    'alter table public.transactions add constraint transactions_status_check check ((%s) or status in (''pending_payment'', ''payment_simulated'', ''seller_confirmed'', ''awaiting_delivery'', ''delivered'', ''completed'', ''cancelled'', ''disputed''))',
    existing_status_check
  );
end;
$$;