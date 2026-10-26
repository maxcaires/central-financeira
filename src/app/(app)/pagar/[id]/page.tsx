import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryFields } from "@/components/entry-fields";
import { Flash } from "@/components/flash";
import { HistoryList } from "@/components/history-list";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatDateBR, todayInZone } from "@/lib/dates";
import { isUuid } from "@/lib/entries";
import type { ActivityRow } from "@/lib/history";
import { COUNTRY_LABEL, OPEN_PAYABLE_STATUSES, PAYABLE_STATUS_LABEL } from "@/lib/labels";
import { formatInputAmount, formatMoney, type Currency } from "@/lib/money";
import { ui } from "@/lib/ui";
import { DeleteSection } from "@/components/delete-section";
import {
  addPayment,
  deletePayable,
  deletePayment,
  setPayableCancelled,
  updatePayable,
} from "../actions";

export default async function ContaPagarPage(props: PageProps<"/pagar/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const { supabase } = await requireUser();
  const { ok, erro } = await props.searchParams;

  const { data: p } = await supabase
    .from("payables_with_balance")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const currency = p.currency as Currency;
  const today = todayInZone();
  const isOpen = (OPEN_PAYABLE_STATUSES as readonly string[]).includes(p.status);
  const isInstallment = p.installment_group_id !== null;

  const [{ data: entities }, { data: payments }, { data: siblings }, { data: history }] =
    await Promise.all([
      supabase.from("entities").select("id, name, country, active").order("country").order("name"),
      supabase
        .from("payable_payments")
        .select("id, amount, paid_on, note")
        .eq("payable_id", id)
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false }),
      isInstallment
        ? supabase
            .from("payables_with_balance")
            .select("id, installment_no, installments_total, due_date, amount, balance, status")
            .eq("installment_group_id", p.installment_group_id)
            .order("installment_no")
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("activity_log")
        .select("id, table_name, action, changes, created_at")
        .or(
          `and(table_name.eq.payables,record_id.eq.${id}),and(table_name.eq.payable_payments,changes->>payable_id.eq.${id})`,
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  // Entidades ativas + a atual (mesmo que desativada), para o seletor de edição.
  const entityOptions = (entities ?? []).filter((e) => e.active || e.id === p.entity_id);
  const entityName = (entities ?? []).find((e) => e.id === p.entity_id)?.name ?? "—";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/pagar" className={`${ui.muted} hover:underline`}>
          ← Contas a pagar
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className={ui.h1}>{p.description}</h1>
          <StatusBadge
            label={PAYABLE_STATUS_LABEL[p.status] ?? p.status}
            status={p.status}
            isOpen={isOpen}
            overdue={p.due_date < today}
          />
        </div>
        <p className={ui.muted}>
          {entityName} · {COUNTRY_LABEL[p.country]} · para {p.payee}
          {isInstallment ? ` · parcela ${p.installment_no}/${p.installments_total}` : ""}
        </p>
      </div>

      <Flash ok={ok} erro={erro} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={ui.card}>
          <p className={ui.muted}>Valor</p>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(Number(p.amount), currency)}</p>
        </div>
        <div className={ui.card}>
          <p className={ui.muted}>Pago</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoney(Number(p.paid_amount), currency)}
          </p>
        </div>
        <div className={ui.card}>
          <p className={ui.muted}>Saldo pendente</p>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(Number(p.balance), currency)}</p>
        </div>
        <div className={ui.card}>
          <p className={ui.muted}>Vencimento</p>
          <p className="text-lg font-semibold">{formatDateBR(p.due_date)}</p>
        </div>
      </div>

      <section className={ui.card}>
        <h2 className="font-medium">Pagamentos</h2>
        {(payments ?? []).length === 0 ? (
          <p className={`${ui.muted} mt-2`}>Nenhum pagamento registrado.</p>
        ) : (
          <table className="mt-2 w-full">
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(payments ?? []).map((pay) => (
                <tr key={pay.id}>
                  <td className={ui.td}>{formatDateBR(pay.paid_on)}</td>
                  <td className={`${ui.td} tabular-nums`}>{formatMoney(Number(pay.amount), currency)}</td>
                  <td className={`${ui.td} ${ui.muted}`}>{pay.note}</td>
                  <td className={`${ui.td} text-right`}>
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="payment_id" value={pay.id} />
                      <button type="submit" className={ui.btnDanger}>
                        Remover
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {p.status !== "cancelled" && Number(p.balance) > 0 && (
          <form action={addPayment} className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-4 dark:border-zinc-800">
            <input type="hidden" name="id" value={id} />
            <label className={ui.label}>
              Valor pago
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={formatInputAmount(Number(p.balance), currency)}
                className={ui.input}
              />
            </label>
            <label className={ui.label}>
              Data
              <input name="paid_on" type="date" required defaultValue={today} max={today} className={ui.input} />
            </label>
            <label className={`${ui.label} sm:col-span-2`}>
              Anotação (opcional)
              <input name="note" maxLength={500} className={ui.input} />
            </label>
            <div className="sm:col-span-4">
              <button type="submit" className={ui.btn}>
                Registrar pagamento
              </button>
              <span className={`${ui.muted} ml-3`}>
                Para pagamento parcial, ajuste o valor.
              </span>
            </div>
          </form>
        )}
      </section>

      {isInstallment && (siblings ?? []).length > 1 && (
        <section className={ui.card}>
          <h2 className="font-medium">Parcelas</h2>
          <table className="mt-2 w-full">
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(siblings ?? []).map((s) => (
                <tr key={s.id} className={s.id === id ? "font-semibold" : ""}>
                  <td className={ui.td}>
                    <Link href={`/pagar/${s.id}`} className="underline-offset-2 hover:underline">
                      {s.installment_no}/{s.installments_total}
                    </Link>
                  </td>
                  <td className={ui.td}>{formatDateBR(s.due_date)}</td>
                  <td className={`${ui.td} tabular-nums`}>{formatMoney(Number(s.amount), currency)}</td>
                  <td className={ui.td}>{PAYABLE_STATUS_LABEL[s.status] ?? s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className={ui.card}>
        <h2 className="font-medium">Editar</h2>
        <form action={updatePayable} className="mt-3 flex flex-col gap-5">
          <input type="hidden" name="id" value={id} />
          <EntryFields
            entities={entityOptions}
            counterpartyLabel="Beneficiário (quem recebe)"
            mode="edit"
            showRecurrence={!isInstallment}
            defaults={{
              entity_id: p.entity_id,
              description: p.description,
              counterparty: p.payee,
              amount: formatInputAmount(Number(p.amount), currency),
              currency,
              due_date: p.due_date,
              recurrence: p.recurrence,
              notes: p.notes,
            }}
          />
          <div>
            <button type="submit" className={ui.btn}>
              Salvar alterações
            </button>
          </div>
        </form>
      </section>

      <section className={ui.card}>
        <h2 className="font-medium">Situação</h2>
        <form action={setPayableCancelled} className="mt-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="cancel" value={p.status === "cancelled" ? "false" : "true"} />
          <button type="submit" className={p.status === "cancelled" ? ui.btn : ui.btnDanger}>
            {p.status === "cancelled" ? "Reativar conta" : "Cancelar conta"}
          </button>
          <span className={`${ui.muted} ml-3`}>
            Contas canceladas saem dos vencimentos e do resumo diário.
          </span>
        </form>
      </section>

      <DeleteSection
        action={deletePayable}
        id={id}
        noun="esta conta"
        consequences={
          isInstallment
            ? "Apaga esta parcela e os pagamentos dela; as outras parcelas continuam."
            : "Apaga a conta e todos os pagamentos dela."
        }
      />

      <section className={ui.card}>
        <h2 className="mb-3 font-medium">Histórico</h2>
        <HistoryList
          rows={(history ?? []) as ActivityRow[]}
          currency={currency}
          statusLabels={PAYABLE_STATUS_LABEL}
          childNoun="Pagamento"
        />
      </section>
    </div>
  );
}
