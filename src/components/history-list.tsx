import { describeActivity, type ActivityRow } from "@/lib/history";
import type { Currency } from "@/lib/money";
import { ui } from "@/lib/ui";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export function HistoryList({
  rows,
  currency,
  statusLabels,
  childNoun,
}: {
  rows: ActivityRow[];
  currency: Currency;
  statusLabels: Record<string, string>;
  childNoun: "Pagamento" | "Recebimento";
}) {
  if (rows.length === 0) return <p className={ui.muted}>Sem histórico.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="text-sm">
          <span className={ui.muted}>{dateTime.format(new Date(r.created_at))}</span>
          {" — "}
          {describeActivity(r, currency, statusLabels, childNoun)}
        </li>
      ))}
    </ul>
  );
}
