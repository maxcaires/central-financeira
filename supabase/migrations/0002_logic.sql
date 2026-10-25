-- Central Financeira — 0002: triggers (status derivado, updated_at, histórico) e views de saldo

-- ---------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger entities_set_updated_at before update on public.entities
  for each row execute function public.set_updated_at();
create trigger payables_set_updated_at before update on public.payables
  for each row execute function public.set_updated_at();
create trigger receivables_set_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();
create trigger notification_settings_set_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Status derivado dos pagamentos/recebimentos.
-- O status é calculado; 'cancelled' é a única escolha manual e é preservada.
-- ---------------------------------------------------------------
create function public.derive_payable_status() returns trigger
language plpgsql as $$
declare
  paid numeric(14, 2);
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select coalesce(sum(amount), 0) into paid
  from public.payable_payments
  where payable_id = new.id;

  if paid >= new.amount then
    new.status := 'paid';
  elsif paid > 0 then
    new.status := 'partially_paid';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger payables_derive_status before insert or update on public.payables
  for each row execute function public.derive_payable_status();

create function public.derive_receivable_status() returns trigger
language plpgsql as $$
declare
  received numeric(14, 2);
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select coalesce(sum(amount), 0) into received
  from public.receivable_receipts
  where receivable_id = new.id;

  if received >= new.amount then
    new.status := 'received';
  elsif received > 0 then
    new.status := 'partially_received';
  else
    new.status := 'open';
  end if;
  return new;
end;
$$;

create trigger receivables_derive_status before insert or update on public.receivables
  for each row execute function public.derive_receivable_status();

-- Quando um pagamento/recebimento muda, "toca" o lançamento para disparar o trigger acima.
create function public.touch_payable_after_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.payables
     set updated_at = now()
   where id = coalesce(new.payable_id, old.payable_id);
  return null;
end;
$$;

create trigger payable_payments_touch after insert or update or delete on public.payable_payments
  for each row execute function public.touch_payable_after_payment();

create function public.touch_receivable_after_receipt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.receivables
     set updated_at = now()
   where id = coalesce(new.receivable_id, old.receivable_id);
  return null;
end;
$$;

create trigger receivable_receipts_touch after insert or update or delete on public.receivable_receipts
  for each row execute function public.touch_receivable_after_receipt();

-- ---------------------------------------------------------------
-- Histórico de alterações
-- ---------------------------------------------------------------
create function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec record;
  payload jsonb;
begin
  if tg_op = 'DELETE' then
    rec := old;
    payload := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    rec := new;
    payload := to_jsonb(new);
  else
    -- Ignora atualizações que mudaram apenas updated_at (ex.: recálculo de status sem efeito).
    if (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
      return null;
    end if;
    rec := new;
    payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  insert into public.activity_log (owner_id, table_name, record_id, action, changes)
  values (rec.owner_id, tg_table_name, rec.id, tg_op, payload);
  return null;
end;
$$;

create trigger payables_log after insert or update or delete on public.payables
  for each row execute function public.log_activity();
create trigger payable_payments_log after insert or update or delete on public.payable_payments
  for each row execute function public.log_activity();
create trigger receivables_log after insert or update or delete on public.receivables
  for each row execute function public.log_activity();
create trigger receivable_receipts_log after insert or update or delete on public.receivable_receipts
  for each row execute function public.log_activity();

-- ---------------------------------------------------------------
-- Views com valor pago/recebido e saldo pendente (respeitam a RLS do usuário)
-- ---------------------------------------------------------------
create view public.payables_with_balance with (security_invoker = true) as
select
  p.*,
  coalesce(pp.paid, 0)::numeric(14, 2)                       as paid_amount,
  greatest(p.amount - coalesce(pp.paid, 0), 0)::numeric(14, 2) as balance
from public.payables p
left join lateral (
  select sum(amount) as paid from public.payable_payments where payable_id = p.id
) pp on true;

create view public.receivables_with_balance with (security_invoker = true) as
select
  r.*,
  coalesce(rr.received, 0)::numeric(14, 2)                       as received_amount,
  greatest(r.amount - coalesce(rr.received, 0), 0)::numeric(14, 2) as balance
from public.receivables r
left join lateral (
  select sum(amount) as received from public.receivable_receipts where receivable_id = r.id
) rr on true;
