import Link from "next/link";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatDateBR, todayInZone } from "@/lib/dates";
import { COUNTRY_LABEL, OPEN_PAYABLE_STATUSES, PAYABLE_STATUS_LABEL } from "@/lib/labels";
import { formatMoney, sumByCurrency, type Currency } from "@/lib/money";
import { ui } from "@/lib/ui";

const LIMIT = 500;

export default async function PagarPage(props: PageProps<"/pagar">) {
  const { supabase } = await requireUser();
  const { ok, erro, todas } = await props.searchParams;
  const showAll = todas === "1";

  let query = supabase
    .from("payables_with_balance")
    .select("*")
    .order("due_date", { ascending: true })
    .limit(LIMIT);
  if (!showAll) query = query.in("status", [...OPEN_PAYABLE_STATUSES]);

  const [{ data: payables, error }, { data: entities }] = await Promise.all([
    query,
    supabase.from("entities").select("id, name"),
  ]);

  const entityName = new Map((entities ?? []).map((e) => [e.id, e.name]));
  const today = todayInZone();
  const rows = payables ?? [];

  const openBalances = sumByCurrency(
    rows
      .filter((p) => (OPEN_PAYABLE_STATUSES as readonly string[]).includes(p.status))
      .map((p) => ({ amount: Number(p.balance), currency: p.currency as Currency })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>Contas a pagar</h1>
        <div className="flex gap-2">
          <Link href={showAll ? "/pagar" : "/pagar?todas=1"} className={ui.btnSecondary}>
            {showAll ? "Só em aberto" : "Mostrar pagas e canceladas"}
          </Link>
          <Link href="/pagar/novo" className={ui.btn}>
            Nova conta
          </Link>
        </div>
      </div>

      <Flash ok={ok} erro={erro} />
      {error && <p className={ui.error}>Não foi possível carregar as contas.</p>}

      <div className={`${ui.card} flex flex-wrap gap-x-8 gap-y-1`}>
        <span className={ui.muted}>Saldo em aberto nesta lista (moedas separadas):</span>
        <span className="text-sm font-medium">{formatMoney(openBalances.BRL, "BRL")}</span>
        <span className="text-sm font-medium">{formatMoney(openBalances.USD, "USD")}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[820px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className={ui.th}>Vencimento</th>
              <th className={ui.th}>Descrição</th>
              <th className={ui.th}>Empresa / categoria</th>
              <th className={ui.th}>País</th>
              <th className={`${ui.th} text-right`}>Valor</th>
              <th className={`${ui.th} text-right`}>Saldo</th>
              <th className={ui.th}>Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((p) => {
              const isOpen = (OPEN_PAYABLE_STATUSES as readonly string[]).includes(p.status);
              const currency = p.currency as Currency;
              return (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className={ui.td}>{formatDateBR(p.due_date)}</td>
                  <td className={ui.td}>
                    <Link href={`/pagar/${p.id}`} className="font-medium underline-offset-2 hover:underline">
                      {p.description}
                    </Link>
                    <div className={ui.muted}>
                      {p.payee}
                      {p.installment_no ? ` · parcela ${p.installment_no}/${p.installments_total}` : ""}
                      {p.recurrence !== "none" ? " · recorrente" : ""}
                    </div>
                  </td>
                  <td className={ui.td}>{entityName.get(p.entity_id) ?? "—"}</td>
                  <td className={ui.td}>{COUNTRY_LABEL[p.country]}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>
                    {formatMoney(Number(p.amount), currency)}
                  </td>
                  <td className={`${ui.td} text-right tabular-nums`}>
                    {formatMoney(Number(p.balance), currency)}
                  </td>
                  <td className={ui.td}>
                    <StatusBadge
                      label={PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                      status={p.status}
                      isOpen={isOpen}
                      overdue={p.due_date < today}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className={`${ui.td} ${ui.muted}`} colSpan={7}>
                  Nenhuma conta {showAll ? "cadastrada" : "em aberto"}.
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
