-- Central Financeira — 0003: Row Level Security
-- Cada usuário só enxerga e altera as próprias linhas (owner_id = auth.uid()).
-- A chave service_role (somente servidor) ignora RLS; nunca deve ir ao navegador.

alter table public.entities              enable row level security;
alter table public.payables              enable row level security;
alter table public.payable_payments      enable row level security;
alter table public.receivables           enable row level security;
alter table public.receivable_receipts   enable row level security;
alter table public.collection_log        enable row level security;
alter table public.activity_log          enable row level security;
alter table public.notification_settings enable row level security;
alter table public.digest_runs           enable row level security;

-- Tabelas simples: dono pode tudo sobre as próprias linhas.
create policy entities_owner on public.entities
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy notification_settings_owner on public.notification_settings
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Lançamentos: a entidade referenciada também precisa ser do usuário.
create policy payables_owner on public.payables
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.entities e where e.id = entity_id and e.owner_id = auth.uid())
  );

create policy receivables_owner on public.receivables
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.entities e where e.id = entity_id and e.owner_id = auth.uid())
  );

-- Filhos: o lançamento pai também precisa ser do usuário.
create policy payable_payments_owner on public.payable_payments
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.payables p where p.id = payable_id and p.owner_id = auth.uid())
  );

create policy receivable_receipts_owner on public.receivable_receipts
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.owner_id = auth.uid())
  );

create policy collection_log_owner on public.collection_log
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.owner_id = auth.uid())
  );

-- Histórico e execuções do resumo: leitura pelo dono; escrita apenas por triggers/servidor.
create policy activity_log_read on public.activity_log
  for select to authenticated
  using (owner_id = auth.uid());

create policy digest_runs_read on public.digest_runs
  for select to authenticated
  using (owner_id = auth.uid());

-- Sem acesso anônimo a nada.
revoke all on all tables in schema public from anon;
