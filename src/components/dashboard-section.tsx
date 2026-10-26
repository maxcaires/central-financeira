import Link from "next/link";
import { formatDateBR } from "@/lib/dates";
import { totalsByCurrency, type DashItem } from "@/lib/dashboard";
import { COUNTRY_LABEL } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { daysBetween } from "@/lib/week";

/** Totais de uma lista, sempre por moeda (zeros omitidos; "—" quando vazia). */
export function TotalsText({ items, stacked = false }: { items: readonly DashItem[]; stacked?: boolean }) {
  const t = totalsByCurrency(items);
  const parts: string[] = [];
  if (t.BRL > 0) parts.push(formatMoney(t.BRL, "BRL"));
  if (t.USD > 0) parts.push(formatMoney(t.USD, "USD"));
  if (parts.length === 0) return <>—</>;
  if (stacked)
    return (
      <>
        {parts.map((v) => (
          <span key={v} className="block">
            {v}
          </span>
        ))}
      </>
    );
  return <>{parts.join(" + ")}</>;
}

const DOT = { danger: "bg-danger", warn: "bg-warn", neutral: "bg-muted" } as const;

export interface DueGroup {
  title: string;
  tone: keyof typeof DOT;
  items: readonly DashItem[];
  emptyText: string;
}

function dueLabel(due: string, today: string): { text: string; late: boolean } {
  const d = daysBetween(today, due);
  if (d < 0) return { text: d === -1 ? "ontem" : `${-d} dias atrás`, late: true };
  if (d === 0) return { text: "hoje", late: false };
  if (d === 1) return { text: "amanhã", late: false };
  return { text: formatDateBR(due).slice(0, 5), late: false };
}

/** Painel de uma coluna (a pagar ou a receber) com os grupos vencidos / hoje / próximos 7 dias. */
export function DueList({
  title,
  kind,
  href,
  today,
  groups,
  entityName,
  showNextAction = false,
}: {
  title: string;
  kind: "pay" | "rec";
  href: string;
  today: string;
  groups: DueGroup[];
  entityName: Map<string, string>;
  showNextAction?: boolean;
}) {
  const all = groups.flatMap((g) => g.items);
  const accent = kind === "pay" ? "text-pay" : "text-rec";
  const stripe = kind === "pay" ? "bg-pay" : "bg-rec";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={`h-1 ${stripe}`} />
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className={`text-lg font-semibold tabular-nums ${accent}`}>
          <TotalsText items={all} />
        </p>
      </header>

      <div className="mt-2 divide-y divide-line">
        {groups.map((g) => (
          <div key={g.title} className="px-5 py-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
              <span className={`h-2 w-2 rounded-full ${DOT[g.tone]}`} />
              {g.title}
              <span className="rounded-full bg-sunken px-1.5 text-xs tabular-nums">{g.items.length}</span>
            </h3>

            {g.items.length === 0 ? (
              <p className="mt-1 pl-4 text-sm text-muted">{g.emptyText}</p>
            ) : (
              <ul className="mt-1">
                {g.items.map((i) => {
                  const due = dueLabel(i.due_date, today);
                  return (
                    <li key={i.id}>
                      <Link
                        href={`${href}/${i.id}`}
                        className="-mx-2 flex items-start justify-between gap-4 rounded-lg px-2 py-2 hover:bg-sunken"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{i.description}</p>
                          <p className="truncate text-xs text-muted">
                            {i.party}
                            {i.installment_no ? ` · parcela ${i.installment_no}/${i.installments_total}` : ""}
                            {" · "}
                            {entityName.get(i.entity_id) ?? "—"} · {COUNTRY_LABEL[i.country] ?? i.country}
                          </p>
                          {showNextAction && i.next_action_at && (
                            <p className="mt-0.5 text-xs text-warn">
                              Cobrar em {formatDateBR(i.next_action_at)}
                              {i.next_action_note ? `: ${i.next_action_note}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatMoney(i.balance, i.currency)}
                          </p>
                          <p className={`text-xs ${due.late ? "font-medium text-danger" : "text-muted"}`}>
                            {due.text}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Cobranças com ação para hoje ou atrasada. */
export function CollectionsPanel({
  items,
  today,
  entityName,
}: {
  items: readonly DashItem[];
  today: string;
  entityName: Map<string, string>;
}) {
  return (
    <section className="rounded-2xl border border-warn/30 bg-warn-soft p-5">
      <h2 className="text-base font-semibold text-warn">
        Cobranças para fazer <span className="tabular-nums">({items.length})</span>
      </h2>
      <ul className="mt-2 divide-y divide-warn/15">
        {items.map((i) => {
          const due = dueLabel(i.next_action_at ?? today, today);
          return (
            <li key={i.id}>
              <Link href={`/receber/${i.id}`} className="flex items-start justify-between gap-4 py-2 hover:opacity-80">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {i.party} <span className="font-normal text-muted">· {i.description}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {i.next_action_note ?? "Sem anotação"} · {entityName.get(i.entity_id) ?? "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(i.balance, i.currency)}</p>
                  <p className="text-xs text-warn">{due.text}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
