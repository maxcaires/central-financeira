import Link from "next/link";
import { formatDateBR } from "@/lib/dates";
import { totalsByCurrency, type DashItem } from "@/lib/dashboard";
import { COUNTRY_LABEL } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { ui } from "@/lib/ui";

const TONE = {
  danger: "border-l-4 border-l-red-500",
  warn: "border-l-4 border-l-amber-500",
  neutral: "border-l-4 border-l-zinc-400",
} as const;

/** Totais de uma lista, sempre por moeda (zeros omitidos; "nada" quando vazia). */
export function TotalsText({ items }: { items: readonly DashItem[] }) {
  const t = totalsByCurrency(items);
  const parts: string[] = [];
  if (t.BRL > 0) parts.push(formatMoney(t.BRL, "BRL"));
  if (t.USD > 0) parts.push(formatMoney(t.USD, "USD"));
  return <>{parts.length ? parts.join(" · ") : "—"}</>;
}

export function DashboardSection({
  title,
  items,
  href,
  tone,
  entityName,
  showNextAction = false,
  emptyText,
}: {
  title: string;
  items: readonly DashItem[];
  href: string; // base do detalhe: "/pagar" ou "/receber"
  tone: keyof typeof TONE;
  entityName: Map<string, string>;
  showNextAction?: boolean;
  emptyText: string;
}) {
  return (
    <section className={`${ui.card} ${TONE[tone]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {title} <span className={ui.muted}>({items.length})</span>
        </h3>
        <p className="text-sm font-medium tabular-nums">
          <TotalsText items={items} />
        </p>
      </div>

      {items.length === 0 ? (
        <p className={`${ui.muted} mt-2`}>{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
              <div className="min-w-0">
                <Link
                  href={`${href}/${i.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {i.description}
                </Link>
                <div className={ui.muted}>
                  {i.party}
                  {i.installment_no ? ` · parcela ${i.installment_no}/${i.installments_total}` : ""}
                  {" · "}
                  {entityName.get(i.entity_id) ?? "—"} · {COUNTRY_LABEL[i.country] ?? i.country}
                </div>
                {showNextAction && i.next_action_at && (
                  <div className="text-sm text-amber-700 dark:text-amber-400">
                    Ação em {formatDateBR(i.next_action_at)}
                    {i.next_action_note ? `: ${i.next_action_note}` : ""}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium tabular-nums">{formatMoney(i.balance, i.currency)}</div>
                <div className={ui.muted}>vence {formatDateBR(i.due_date)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
