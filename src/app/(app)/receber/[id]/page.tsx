import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactFields } from "@/components/contact-fields";
import { EntryFields } from "@/components/entry-fields";
import { Flash } from "@/components/flash";
import { HistoryList } from "@/components/history-list";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatDateBR, todayInZone } from "@/lib/dates";
import { isUuid } from "@/lib/entries";
import type { ActivityRow } from "@/lib/history";
import { COUNTRY_LABEL, OPEN_RECEIVABLE_STATUSES, RECEIVABLE_STATUS_LABEL } from "@/lib/labels";
import { formatInputAmount, formatMoney, type Currency } from "@/lib/money";
import { ui } from "@/lib/ui";
import { DeleteSection } from "@/components/delete-section";
import {
  addReceipt,
  deleteReceipt,
  deleteReceivable,
  setReceivableCancelled,
  updateReceivable,
} from "../actions";

export default async function ValorReceberPage(props: PageProps<"/receber/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const { supabase } = await requireUser();
  const { ok, erro } = await props.searchParams;

  const { data: r } = await supabase
    .from("receivables_with_balance")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const currency = r.currency as Currency;
  const today = todayInZone();
  const isOpen = (OPEN_RECEIVABLE_STATUSES as readonly string[]).includes(r.status);
  const isInstallment = r.installment_group_id !== null;

  const [{ data: entities }, { data: receipts }, { data: siblings }, { data: history }] =
    await Promise.all([
      supabase.from("entities").select("id, name, country, active").order("country").order("name"),
      supabase
        .from("receivable_receipts")
        .select("id, amount, received_on, note")
        .eq("receivable_id", id)
        .order("received_on", { ascending: false })
        .order("created_at", { ascending: false }),
      isInstallment
        ? supabase
            .from("receivables_with_balance")
            .select("id, installment_no, installments_total, due_date, amount, balance, status")
            .eq("installment_group_id", r.installment_group_id)
            .order("installment_no")
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("activity_log")
        .select("id, table_name, action, changes, created_at")
        .or(
          `and(table_name.eq.receivables,record_id.eq.${id}),and(table_name.eq.receivable_receipts,changes->>receivable_id.eq.${id})`,
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const entityOptions = (entities ?? []).filter((e) => e.active || e.id === r.entity_id);
  const entityName = (entities ?? []).find((e) => e.id === r.entity_id)?.name ?? "—";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/receber" className={`${ui.muted} hover:underline`}>
          ← Contas a receber
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className={ui.h1}>{r.description}</h1>
          <StatusBadge
            label={RECEIVABLE_STATUS_LABEL[r.status] ?? r.status}
            status={r.status}
            isOpen={isOpen}
            overdue={r.due_date < today}
          />
        </div>
        <p className={ui.muted}>
          {entityName} · {COUNTRY_LABEL[r.country]} · devedor: {r.debtor_name}
          {isInstallment ? ` · parcela ${r.installment_no}/${r.installments_total}` : ""}
        </p>
      </div>

      <Flash ok={ok} erro={erro} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={ui.card}>
          <p className={ui.muted}>Valor original</p>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(Number(r.amount), currency)}</p>
        </div>
        <div className={ui.card}>
          <p className={ui.muted}>Recebido</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoney(Number(r.received_amount), currency)}
          </p>
        </div>
        <div className={ui.card}>
          <p className={ui.muted}>Saldo pendente</p>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(Number(r.balance), currency)}</p>
        </div>
        <div className={ui.card}>
          <p className={ui.muted}>Vencimento previsto</p>
          <p className="text-lg font-semibold">{formatDateBR(r.due_date)}</p>
        </div>
      </div>

      {(r.contact_phone || r.contact_email || r.next_action_at || r.last_contact_at) && (
        <section className={ui.card}>
          <h2 className="font-medium">Cobrança</h2>
          <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {r.contact_phone && (
              <div>
                <dt className={ui.muted}>Telefone</dt>
                <dd>{r.contact_phone}</dd>
              </div>
            )}
            {r.contact_email && (
              <div>
                <dt className={ui.muted}>E-mail</dt>
                <dd>{r.contact_email}</dd>
              </div>
            )}
            {r.last_contact_at && (
              <div>
                <dt className={ui.muted}>Último contato</dt>
                <dd>{formatDateBR(r.last_contact_at)}</dd>
              </div>
            )}
            {r.next_action_at && (
              <div>
                <dt className={ui.muted}>Próxima ação</dt>
                <dd>
                  {formatDateBR(r.next_action_at)}
                  {r.next_action_note ? ` — ${r.next_action_note}` : ""}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className={ui.card}>
        <h2 className="font-medium">Recebimentos</h2>
        {(receipts ?? []).length === 0 ? (
          <p className={`${ui.muted} mt-2`}>Nenhum recebimento registrado.</p>
        ) : (
          <table className="mt-2 w-full">
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(receipts ?? []).map((rc) => (
                <tr key={rc.id}>
                  <td className={ui.td}>{formatDateBR(rc.received_on)}</td>
                  <td className={`${ui.td} tabular-nums`}>{formatMoney(Number(rc.amount), currency)}</td>
                  <td className={`${ui.td} ${ui.muted}`}>{rc.note}</td>
                  <td className={`${ui.td} text-right`}>
                    <form action={deleteReceipt}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="receipt_id" value={rc.id} />
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

        {r.status !== "cancelled" && Number(r.balance) > 0 && (
          <form action={addReceipt} className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-4 dark:border-zinc-800">
            <input type="hidden" name="id" value={id} />
            <label className={ui.label}>
              Valor recebido
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={formatInputAmount(Number(r.balance), currency)}
                className={ui.input}
              />
            </label>
            <label className={ui.label}>
              Data
              <input name="received_on" type="date" required defaultValue={today} max={today} className={ui.input} />
            </label>
            <label className={`${ui.label} sm:col-span-2`}>
              Anotação (opcional)
              <input name="note" maxLength={500} className={ui.input} />
            </label>
            <div className="sm:col-span-4">
              <button type="submit" className={ui.btn}>
                Registrar recebimento
              </button>
              <span className={`${ui.muted} ml-3`}>
                Para recebimento parcial, ajuste o valor.
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
                    <Link href={`/receber/${s.id}`} className="underline-offset-2 hover:underline">
                      {s.installment_no}/{s.installments_total}
                    </Link>
                  </td>
                  <td className={ui.td}>{formatDateBR(s.due_date)}</td>
                  <td className={`${ui.td} tabular-nums`}>{formatMoney(Number(s.amount), currency)}</td>
                  <td className={ui.td}>{RECEIVABLE_STATUS_LABEL[s.status] ?? s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className={ui.card}>
        <h2 className="font-medium">Editar</h2>
        <form action={updateReceivable} className="mt-3 flex flex-col gap-5">
          <input type="hidden" name="id" value={id} />
          <EntryFields
            entities={entityOptions}
            counterpartyLabel="Devedor (quem deve a você)"
            mode="edit"
            showRecurrence={false}
            defaults={{
              entity_id: r.entity_id,
              description: r.description,
              counterparty: r.debtor_name,
              amount: formatInputAmount(Number(r.amount), currency),
              currency,
              due_date: r.due_date,
              notes: r.notes,
            }}
          />
          <ContactFields
            defaults={{
              contact_phone: r.contact_phone,
              contact_email: r.contact_email,
              contact_notes: r.contact_notes,
              last_contact_at: r.last_contact_at,
              next_action_at: r.next_action_at,
              next_action_note: r.next_action_note,
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
        <form action={setReceivableCancelled} className="mt-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="cancel" value={r.status === "cancelled" ? "false" : "true"} />
          <button type="submit" className={r.status === "cancelled" ? ui.btn : ui.btnDanger}>
            {r.status === "cancelled" ? "Reativar lançamento" : "Cancelar lançamento"}
          </button>
          <span className={`${ui.muted} ml-3`}>
            Lançamentos cancelados saem dos vencimentos e do resumo diário.
          </span>
        </form>
      </section>

      <DeleteSection
        action={deleteReceivable}
        id={id}
        noun="este lançamento"
        consequences={
          isInstallment
            ? "Apaga esta parcela, os recebimentos e o histórico de cobrança dela; as outras parcelas continuam."
            : "Apaga o lançamento, os recebimentos e o histórico de cobrança dele."
        }
      />

      <section className={ui.card}>
        <h2 className="mb-3 font-medium">Histórico</h2>
        <HistoryList
          rows={(history ?? []) as ActivityRow[]}
          currency={currency}
          statusLabels={RECEIVABLE_STATUS_LABEL}
          childNoun="Recebimento"
        />
      </section>
    </div>
  );
}
