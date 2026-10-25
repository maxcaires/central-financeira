-- Central Financeira — seed de DESENVOLVIMENTO (dados 100% fictícios)
--
-- Uso: crie primeiro um usuário (Authentication) e então rode este arquivo.
-- Se ainda não existir usuário, o seed é ignorado sem erro.
-- NÃO rode em produção: os nomes e valores abaixo são exemplos.
-- Datas são relativas a hoje (fuso America/Sao_Paulo) para exercitar vencidos/hoje/próximos 7 dias.

do $$
declare
  uid          uuid := (select id from auth.users order by created_at limit 1);
  today        date := (now() at time zone 'America/Sao_Paulo')::date;
  e_br1        uuid := gen_random_uuid();
  e_br2        uuid := gen_random_uuid();
  e_br3        uuid := gen_random_uuid();
  e_br4        uuid := gen_random_uuid();
  e_us1        uuid := gen_random_uuid();
  e_pbr        uuid := gen_random_uuid();
  e_pus        uuid := gen_random_uuid();
  p_id         uuid := gen_random_uuid();
  r_id         uuid := gen_random_uuid();
  grp          uuid := gen_random_uuid();
begin
  if uid is null then
    raise notice 'Seed ignorado: nenhum usuário em auth.users. Crie um usuário e rode novamente.';
    return;
  end if;

  if exists (select 1 from public.entities where owner_id = uid) then
    raise notice 'Seed ignorado: já existem entidades para este usuário.';
    return;
  end if;

  -- Entidades (nomes genéricos; renomeie pelo sistema depois)
  insert into public.entities (id, owner_id, name, kind, country) values
    (e_br1, uid, 'Empresa BR 1',   'company',  'BR'),
    (e_br2, uid, 'Empresa BR 2',   'company',  'BR'),
    (e_br3, uid, 'Empresa BR 3',   'company',  'BR'),
    (e_br4, uid, 'Empresa BR 4',   'company',  'BR'),
    (e_us1, uid, 'Empresa EUA 1',  'company',  'US'),
    (e_pbr, uid, 'Pessoal Brasil', 'personal', 'BR'),
    (e_pus, uid, 'Pessoal EUA',    'personal', 'US');

  -- Contas a pagar
  insert into public.payables (owner_id, entity_id, description, payee, amount, currency, country, due_date, recurrence, notes) values
    (uid, e_br1, 'Aluguel do escritório (exemplo)', 'Imobiliária Exemplo', 4500.00, 'BRL', 'BR', today - 3, 'monthly', 'Vencida — exemplo'),
    (uid, e_br2, 'Fornecedor de materiais (exemplo)', 'Fornecedor Alfa', 1280.50, 'BRL', 'BR', today, 'none', 'Vence hoje — exemplo'),
    (uid, e_br3, 'Internet (exemplo)', 'Provedor Beta', 199.90, 'BRL', 'BR', today + 2, 'monthly', null),
    (uid, e_us1, 'Software subscription (example)', 'Vendor Gamma', 350.00, 'USD', 'US', today + 5, 'monthly', null),
    (uid, e_pbr, 'Condomínio (exemplo)', 'Condomínio Exemplo', 820.00, 'BRL', 'BR', today + 6, 'monthly', null),
    (uid, e_pus, 'Car insurance (example)', 'Insurer Delta', 140.00, 'USD', 'US', today + 20, 'monthly', 'Fora da janela de 7 dias'),
    (uid, e_br4, 'Serviço cancelado (exemplo)', 'Prestador Épsilon', 600.00, 'BRL', 'BR', today - 10, 'none', 'Cancelada: não deve aparecer nos resumos');

  update public.payables set status = 'cancelled'
   where owner_id = uid and description = 'Serviço cancelado (exemplo)';

  -- Conta a pagar com pagamento parcial
  insert into public.payables (id, owner_id, entity_id, description, payee, amount, currency, country, due_date, notes)
  values (p_id, uid, e_br1, 'Imposto parcelado (exemplo)', 'Órgão Exemplo', 3000.00, 'BRL', 'BR', today - 1, 'Pagamento parcial — exemplo');
  insert into public.payable_payments (owner_id, payable_id, amount, paid_on, note)
  values (uid, p_id, 1000.00, today - 5, 'Primeira parte');

  -- Contas a receber
  insert into public.receivables (owner_id, entity_id, description, debtor_name, amount, currency, country, due_date,
                                  contact_phone, contact_email, contact_notes, last_contact_at, next_action_at, next_action_note) values
    (uid, e_br1, 'Serviço prestado (exemplo)', 'Cliente Zeta (fictício)', 7500.00, 'BRL', 'BR', today - 7,
       '(00) 00000-0000', 'cliente.zeta@example.com', 'Contato fictício', today - 4, today, 'Ligar para combinar nova data'),
    (uid, e_br2, 'Venda a prazo (exemplo)', 'Cliente Eta (fictício)', 2300.00, 'BRL', 'BR', today,
       null, 'cliente.eta@example.com', null, null, null, null),
    (uid, e_us1, 'Consulting invoice (example)', 'Client Theta (fictional)', 5200.00, 'USD', 'US', today + 3,
       null, 'client.theta@example.com', null, null, null, null),
    (uid, e_pbr, 'Empréstimo a amigo (exemplo)', 'Pessoa Iota (fictícia)', 1500.00, 'BRL', 'BR', today - 20,
       null, null, 'Cobrar com cuidado', today - 15, today + 1, 'Enviar mensagem'),
    (uid, e_pus, 'Rent deposit refund (example)', 'Landlord Kappa (fictional)', 900.00, 'USD', 'US', today + 12,
       null, null, null, null, null, null);

  -- Conta a receber com recebimento parcial
  insert into public.receivables (id, owner_id, entity_id, description, debtor_name, amount, currency, country, due_date, notes)
  values (r_id, uid, e_br3, 'Projeto (exemplo)', 'Cliente Lambda (fictício)', 10000.00, 'BRL', 'BR', today - 2, 'Recebimento parcial — exemplo');
  insert into public.receivable_receipts (owner_id, receivable_id, amount, received_on, note)
  values (uid, r_id, 4000.00, today - 1, 'Entrada');

  -- Parcelamento a receber: 3 parcelas mensais (cada uma é uma linha com vencimento próprio)
  insert into public.receivables (owner_id, entity_id, description, debtor_name, amount, currency, country, due_date,
                                  installment_group_id, installment_no, installments_total)
  select uid, e_br4, 'Venda parcelada (exemplo)', 'Cliente Mi (fictício)', 1200.00, 'BRL', 'BR',
         today + ((n - 1) * 30) + 4, grp, n, 3
  from generate_series(1, 3) as n;

  -- Histórico de cobrança de exemplo
  insert into public.collection_log (owner_id, receivable_id, contacted_on, channel, note, next_action_at)
  select uid, id, today - 4, 'whatsapp', 'Cliente pediu mais prazo (exemplo)', today
  from public.receivables
  where owner_id = uid and debtor_name = 'Cliente Zeta (fictício)';

  -- Resumo diário: configuração criada DESLIGADA. Nenhum e-mail é enviado.
  insert into public.notification_settings (owner_id, recipient_email, enabled)
  values (uid, null, false)
  on conflict (owner_id) do nothing;
end;
$$;
