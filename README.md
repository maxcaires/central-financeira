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
| 3 | Cadastros (entidades, pagar, receber, parcelas, pagamentos) | **Código concluído**; falta testar com um Supabase real |
| 4 | Painel e filtros | **Concluída** (conferir no ambiente real) |
| 5 | Cobranças | **Concluída** (conferir no ambiente real) |
| 6 | Resumo diário em modo teste (sem envio) | Pendente |
| 7 | Envio real e agendamento | Pendente (requer autorização) |
| 8 | Publicação | Pendente |

**Nenhum serviço externo está configurado e nenhum e-mail é enviado.**

## Configurar o Supabase (passo a passo)

Você faz estes passos no seu navegador. **Nunca cole senhas ou chaves em conversas, commits ou prints.**

1. Crie uma conta em [supabase.com](https://supabase.com) e um **New project** (plano gratuito; região
   *South America (São Paulo)*). Guarde a senha do banco em um gerenciador de senhas; o app não usa essa senha.
2. No projeto, abra **SQL Editor** e execute, **nesta ordem**, o conteúdo de
   `supabase/migrations/0001_schema.sql`, `0002_logic.sql` e `0003_rls.sql`.
3. Abra **Authentication → Users → Add user** e crie o seu usuário (e-mail + senha, marcando *Auto Confirm User*).
4. Em **Authentication → Sign In / Providers**, **desligue "Allow new users to sign up"**. O app é só seu e
   não tem tela de cadastro.
5. Em **Project Settings → API** (ou botão **Connect**), copie a **Project URL** e a chave **pública**
   (*anon* ou *publishable*). **Nunca use a chave `service_role`/*secret* no app nesta etapa.**
6. Na raiz do projeto, crie o arquivo `.env.local` com apenas estas duas linhas:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<sua Project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua chave pública>
   ```

7. `npm install` e `npm run dev`, abra <http://localhost:3000> e entre com o usuário do passo 3.
   Depois de editar o `.env.local`, reinicie o servidor.

Primeiros passos no sistema: **Configurações** → cadastre suas empresas/categorias pessoais → crie uma conta
a pagar e um valor a receber.

> Não rode `supabase/seed.sql` no projeto real: ele cria dados fictícios que não têm botão de exclusão
> (só de cancelamento). Teste com 1 ou 2 lançamentos seus ou use um segundo projeto Supabase só para testes.

## O que a Etapa 5 entrega (cobranças)

Na página de cada valor a receber, a seção **Histórico de cobrança** permite:

- **Registrar um contato:** data (não pode ser futura), canal (telefone, WhatsApp, e-mail, pessoalmente ou outro),
  o que foi combinado e a **próxima ação** (data e nota).
- Registrar um contato **resolve a pendência anterior**: a próxima ação passa a ser a nova data informada,
  ou nenhuma se o campo ficar em branco. O "último contato" nunca recua.
- **Remover** um registro enganado do histórico (isso não altera o último contato nem a próxima ação).
- As cobranças com próxima ação para hoje ou atrasada aparecem no painel, com link para registrar o contato.

Regras em `src/lib/collections.ts` (sem dependências e com testes). Não exige nova migration: usa a tabela
`collection_log` que já existia.

## O que a Etapa 4 entrega (painel)

A tela inicial mostra, para **hoje** (fuso America/Sao_Paulo):

- **Resumo** de saldos pendentes por moeda: vencidos, vencem hoje e próximos 7 dias, a pagar e a receber.
- **Listas detalhadas** de cada seção, com link para o lançamento.
- **Cobranças para hoje ou atrasadas:** valores a receber com "próxima ação" até hoje, mesmo que o vencimento seja futuro.
- **Filtros** por empresa/categoria, tipo (empresas ou pessoal), país, moeda e situação (sem pagamento ou parcial). O filtro fica na URL, então dá para salvar nos favoritos.

Cada item aparece em uma única seção (vencido, hoje ou próximos 7 dias), e itens quitados ou cancelados não entram.
A regra fica em `src/lib/dashboard.ts`, sem dependências, e será reaproveitada no resumo diário (Etapa 6).

## O que a Etapa 3 entrega

- **Login** por e-mail e senha (Supabase Auth). Todas as páginas exigem sessão.
- **Configurações:** cadastrar, renomear e ativar/desativar empresas e categorias pessoais.
- **Contas a pagar:** lista (só em aberto, ou todas), novo lançamento, edição, pagamentos parciais ou totais
  (com remoção), cancelar/reativar, parcelas, recorrência e histórico de alterações.
- **Contas a receber:** o mesmo, com contato do devedor, último contato e próxima ação de cobrança.
- **Parcelas:** de 1 a 60, vencendo mensalmente a partir da 1ª data. O valor informado pode ser o total
  (dividido sem perder centavos) ou o de cada parcela.
- **Recorrência (a pagar):** ao quitar uma conta recorrente, o próximo vencimento é criado automaticamente, uma única vez.
- O saldo e o status são calculados no banco; valores só são aceitos até o saldo pendente.

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
