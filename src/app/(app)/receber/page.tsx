import Link from "next/link";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatDateBR, todayInZone } from "@/lib/dates";
import { COUNTRY_LABEL, OPEN_RECEIVABLE_STATUSES, RECEIVABLE_STATUS_LABEL } from "@/lib/labels";
import { formatMoney, sumByCurrency, type Currency } from "@/lib/money";
import { ui } from "@/lib/ui";

const LIMIT = 500;

export default async function ReceberPage(props: PageProps<"/receber">) {
  const { supabase } = await requireUser();
  const { ok, erro, todas } = await props.searchParams;
  const showAll = todas === "1";

  let query = supabase
    .from("receivables_with_balance")
    .select("*")
    .order("due_date", { ascending: true })
    .limit(LIMIT);
  if (!showAll) query = query.in("status", [...OPEN_RECEIVABLE_STATUSES]);

  const [{ data: receivables, error }, { data: entities }] = await Promise.all([
    query,
    supabase.from("entities").select("id, name"),
  ]);

  const entityName = new Map((entities ?? []).map((e) => [e.id, e.name]));
  const today = todayInZone();
  const rows = receivables ?? [];

  const openBalances = sumByCurrency(
    rows
      .filter((r) => (OPEN_RECEIVABLE_STATUSES as readonly string[]).includes(r.status))
      .map((r) => ({ amount: Number(r.balance), currency: r.currency as Currency })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>Contas a receber</h1>
        <div className="flex gap-2">
          <Link href={showAll ? "/receber" : "/receber?todas=1"} className={ui.btnSecondary}>
            {showAll ? "Só em aberto" : "Mostrar recebidas e canceladas"}
          </Link>
          <Link href="/receber/novo" className={ui.btn}>
            Novo valor a receber
          </Link>
        </div>
      </div>

      <Flash ok={ok} erro={erro} />
      {error && <p className={ui.error}>Não foi possível carregar os valores a receber.</p>}

      <div className={`${ui.card} flex flex-wrap gap-x-8 gap-y-1`}>
        <span className={ui.muted}>Saldo em aberto nesta lista (moedas separadas):</span>
        <span className="text-sm font-medium">{formatMoney(openBalances.BRL, "BRL")}</span>
        <span className="text-sm font-medium">{formatMoney(openBalances.USD, "USD")}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[900px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className={ui.th}>Vencimento</th>
              <th className={ui.th}>Descrição / devedor</th>
              <th className={ui.th}>Empresa / categoria</th>
              <th className={ui.th}>País</th>
              <th className={`${ui.th} text-right`}>Valor</th>
              <th className={`${ui.th} text-right`}>Saldo</th>
              <th className={ui.th}>Próxima ação</th>
              <th className={ui.th}>Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((r) => {
              const isOpen = (OPEN_RECEIVABLE_STATUSES as readonly string[]).includes(r.status);
              const currency = r.currency as Currency;
              return (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className={ui.td}>{formatDateBR(r.due_date)}</td>
                  <td className={ui.td}>
                    <Link href={`/receber/${r.id}`} className="font-medium underline-offset-2 hover:underline">
                      {r.description}
                    </Link>
                    <div className={ui.muted}>
                      {r.debtor_name}
                      {r.installment_no ? ` · parcela ${r.installment_no}/${r.installments_total}` : ""}
                    </div>
                  </td>
                  <td className={ui.td}>{entityName.get(r.entity_id) ?? "—"}</td>
                  <td className={ui.td}>{COUNTRY_LABEL[r.country]}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>
                    {formatMoney(Number(r.amount), currency)}
                  </td>
                  <td className={`${ui.td} text-right tabular-nums`}>
                    {formatMoney(Number(r.balance), currency)}
                  </td>
                  <td className={ui.td}>
                    {isOpen && r.next_action_at ? (
                      <span className={r.next_action_at <= today ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
                        {formatDateBR(r.next_action_at)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={ui.td}>
                    <StatusBadge
                      label={RECEIVABLE_STATUS_LABEL[r.status] ?? r.status}
                      status={r.status}
                      isOpen={isOpen}
                      overdue={r.due_date < today}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className={`${ui.td} ${ui.muted}`} colSpan={8}>
                  Nenhum valor {showAll ? "cadastrado" : "em aberto"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length >= LIMIT && (
        <p className={ui.muted}>Mostrando os primeiros {LIMIT} lançamentos por vencimento.</p>
      )}
    </div>
  );
}
