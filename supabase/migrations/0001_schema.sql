-- Central Financeira — 0001: tabelas e índices
-- Valores monetários em numeric(14,2). BRL e USD nunca são convertidos.
-- Cada linha pertence a um usuário (owner_id); RLS é ativada em 0003.

-- ---------------------------------------------------------------
-- Entidades: empresas e categorias pessoais (cadastráveis/renomeáveis)
-- ---------------------------------------------------------------
create table public.entities (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  kind        text not null check (kind in ('company', 'personal')),
  country     text not null check (country in ('BR', 'US')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Contas a pagar
-- ---------------------------------------------------------------
create table public.payables (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity_id             uuid not null references public.entities (id) on delete restrict,
  description           text not null check (length(trim(description)) > 0),
  payee                 text not null check (length(trim(payee)) > 0),
  amount                numeric(14, 2) not null check (amount > 0),
  currency              text not null check (currency in ('BRL', 'USD')),
  country               text not null check (country in ('BR', 'US')),
  due_date              date not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'partially_paid', 'paid', 'cancelled')),
  recurrence            text not null default 'none'
                          check (recurrence in ('none', 'weekly', 'monthly', 'yearly')),
  recurrence_parent_id  uuid references public.payables (id) on delete set null,
  installment_group_id  uuid,
  installment_no        integer,
  installments_total    integer,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint payables_installment_consistency check (
    (installment_group_id is null and installment_no is null and installments_total is null)
    or (installment_group_id is not null
        and installments_total >= 1
        and installment_no between 1 and installments_total)
  )
);

create table public.payable_payments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payable_id  uuid not null references public.payables (id) on delete cascade,
  amount      numeric(14, 2) not null check (amount > 0),
  paid_on     date not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Contas a receber
-- ---------------------------------------------------------------
create table public.receivables (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity_id             uuid not null references public.entities (id) on delete restrict,
  description           text not null check (length(trim(description)) > 0),
  debtor_name           text not null check (length(trim(debtor_name)) > 0),
  amount                numeric(14, 2) not null check (amount > 0),
  currency              text not null check (currency in ('BRL', 'USD')),
  country               text not null check (country in ('BR', 'US')),
  due_date              date not null,
  status                text not null default 'open'
                          check (status in ('open', 'partially_received', 'received', 'cancelled')),
  contact_phone         text,
  contact_email         text,
  contact_notes         text,
  last_contact_at       date,
  next_action_at        date,
  next_action_note      text,
  installment_group_id  uuid,
  installment_no        integer,
  installments_total    integer,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint receivables_installment_consistency check (
    (installment_group_id is null and installment_no is null and installments_total is null)
    or (installment_group_id is not null
        and installments_total >= 1
        and installment_no between 1 and installments_total)
  )
);

create table public.receivable_receipts (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  receivable_id  uuid not null references public.receivables (id) on delete cascade,
  amount         numeric(14, 2) not null check (amount > 0),
  received_on    date not null,
  note           text,
  created_at     timestamptz not null default now()
);

-- Histórico de cobranças (contatos feitos e próxima ação)
create table public.collection_log (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  receivable_id   uuid not null references public.receivables (id) on delete cascade,
  contacted_on    date not null default current_date,
  channel         text check (channel in ('phone', 'whatsapp', 'email', 'in_person', 'other')),
  note            text,
  next_action_at  date,
  created_at      timestamptz not null default now()
);

-- Histórico de alterações (preenchido por trigger; ver 0002)
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changes     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Resumo diário (planejado; nasce DESLIGADO)
-- ---------------------------------------------------------------
create table public.notification_settings (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  recipient_email  text,
  send_hour        smallint not null default 8 check (send_hour between 0 and 23),
  timezone         text not null default 'America/Sao_Paulo',
  enabled          boolean not null default false,
  include_empty    boolean not null default true,  -- enviar "nada pendente" quando não houver itens
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Um registro por dia: garante no máximo um e-mail por dia, mesmo se o agendador disparar duas vezes.
create table public.digest_runs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  run_date    date not null,
  status      text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at     timestamptz,
  counts      jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  unique (owner_id, run_date)
);

-- ---------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------
create index entities_owner_idx on public.entities (owner_id);

create index payables_owner_due_idx on public.payables (owner_id, due_date);
create index payables_open_due_idx on public.payables (due_date)
  where status in ('pending', 'partially_paid');
create index payables_entity_idx on public.payables (entity_id);
create index payables_installment_group_idx on public.payables (installment_group_id)
  where installment_group_id is not null;
create index payable_payments_payable_idx on public.payable_payments (payable_id);

create index receivables_owner_due_idx on public.receivables (owner_id, due_date);
create index receivables_open_due_idx on public.receivables (due_date)
  where status in ('open', 'partially_received');
create index receivables_entity_idx on public.receivables (entity_id);
create index receivables_installment_group_idx on public.receivables (installment_group_id)
  where installment_group_id is not null;
create index receivable_receipts_receivable_idx on public.receivable_receipts (receivable_id);

create index collection_log_receivable_idx on public.collection_log (receivable_id);
create index activity_log_record_idx on public.activity_log (table_name, record_id, created_at desc);
