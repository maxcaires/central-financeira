# Central Financeira

Sistema web simples para acompanhar **contas a pagar**, **valores a receber** e **cobranças pendentes**
de 4 empresas brasileiras, 1 empresa americana e despesas/recebimentos pessoais (Brasil e EUA).

Não é um sistema contábil: não controla saldos bancários nem calcula dinheiro disponível.
BRL e USD ficam sempre separados, sem conversão automática.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (PostgreSQL + Auth), a partir da Etapa 3
- Resend para o resumo diário, somente na Etapa 7
- Agendamento na nuvem com `pg_cron` do Supabase às 08:00 (`America/Sao_Paulo`), Etapa 7

## Status

| Etapa | Descrição | Situação |
|---|---|---|
| 1 | Planejamento | Concluída |
| 2 | Base do projeto, migrations e seed | **Concluída** |
| 3 | Cadastros (entidades, pagar, receber, parcelas, pagamentos) | Pendente |
| 4 | Painel e filtros | Pendente |
| 5 | Cobranças | Pendente |
| 6 | Resumo diário em modo teste (sem envio) | Pendente |
| 7 | Envio real e agendamento | Pendente (requer autorização) |
| 8 | Publicação | Pendente |

**Nenhum serviço externo está configurado e nenhum e-mail é enviado.**

## Comandos

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # build de produção
npm run typecheck  # verificação de tipos
npm run lint
npm test           # testes unitários (datas e moedas)
```

## Estrutura

```
src/app/                    Telas e rotas
  (auth)/login/             Login (Etapa 3)
  (app)/pagar|receber|configuracoes/
  api/cron/daily-digest/    Rota protegida do resumo (Etapa 7)
src/lib/money.ts            Moedas: formatação e soma sempre por moeda
src/lib/dates.ts            Datas no fuso America/Sao_Paulo e classificação de vencimentos
src/lib/digest/             Montagem do resumo diário (Etapa 6)
src/lib/supabase/           Clientes do Supabase (Etapa 3)
src/types/                  Tipos do domínio
supabase/migrations/        SQL versionado (0001 tabelas, 0002 regras, 0003 RLS)
supabase/seed.sql           Dados fictícios de desenvolvimento
emails/                     Template do resumo (Etapa 6/7)
tests/                      Testes
```

## Banco de dados

- `entities`: empresas e categorias pessoais. São cadastradas e renomeadas pelo sistema, sem alterar código.
- `payables` / `payable_payments`: contas a pagar e seus pagamentos (parciais ou totais).
- `receivables` / `receivable_receipts`: valores a receber e seus recebimentos.
- `collection_log`: histórico de cobranças e próximas ações.
- `activity_log`: histórico de alterações, preenchido por trigger.
- `notification_settings`: configuração do resumo diário. **Nasce desligado.**
- `digest_runs`: um registro por dia, garantindo no máximo um e-mail diário.
- Views `payables_with_balance` e `receivables_with_balance` trazem valor pago/recebido e saldo.

Regras importantes:

- Valores em `numeric(14,2)`; moeda restrita a `BRL` ou `USD`.
- O **status é derivado** dos pagamentos/recebimentos por trigger. A única escolha manual é `cancelled`.
- Cada parcela é uma linha própria, ligada às demais por `installment_group_id`.
- "Vencido" não é gravado: é calculado comparando o vencimento com "hoje" no fuso configurado.
- RLS ativada em todas as tabelas; cada usuário só acessa as próprias linhas. Sem acesso anônimo.

### Aplicar as migrations (futuro)

As migrations devem ser aplicadas em ordem (`0001`, `0002`, `0003`), por exemplo com a CLI do Supabase
(`supabase db push`) ou colando no SQL Editor do projeto. Isso só será feito quando você autorizar
a criação do projeto no Supabase.

### Seed de desenvolvimento

`supabase/seed.sql` cria 7 entidades genéricas e lançamentos **fictícios** com datas relativas a hoje
(vencidos, hoje, próximos 7 dias, parcelas, pagamento parcial e um item cancelado).
Se não houver usuário em `auth.users`, o seed é ignorado sem erro. **Não rode em produção.**

## Resumo diário (planejado, não ativo)

Um único e-mail por dia às 08:00 (`America/Sao_Paulo`, incluindo fins de semana e feriados), mesmo quando
não houver nada pendente. Cada item aberto aparece em exatamente uma seção, avaliada nesta ordem:

1. Vencidos (`vencimento < hoje`)
2. Vencem hoje
3. Próximos 7 dias

Agrupado por entidade, país e moeda, com subtotais por moeda. Como o Brasil não tem horário de verão,
08:00 equivale a 11:00 UTC (`0 11 * * *`).

## Segurança

- Nunca commite `.env.local`. O `.env.example` contém apenas os nomes das variáveis.
- A chave `SUPABASE_SERVICE_ROLE_KEY` é secreta e só pode ser usada no servidor.
- A rota do resumo será protegida por `CRON_SECRET`.
