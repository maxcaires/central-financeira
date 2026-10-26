import { formatMoney, type Currency } from "@/lib/money";
import type { WeekColumn } from "@/lib/week";

const MAX_BAR = 44; // px, metade da área do gráfico

function amounts(t: Record<Currency, number>): string[] {
  const out: string[] = [];
  if (t.BRL > 0) out.push(formatMoney(t.BRL, "BRL"));
  if (t.USD > 0) out.push(formatMoney(t.USD, "USD"));
  return out;
}

function bar(count: number, max: number): number {
  if (count === 0) return 0;
  return Math.max(8, Math.round((count / max) * MAX_BAR));
}

/** Os próximos 7 dias de relance: barras para cima = a receber, para baixo = a pagar. */
export function WeekStrip({ columns }: { columns: WeekColumn[] }) {
  const max = Math.max(1, ...columns.flatMap((c) => [c.payCount, c.recCount]));

  return (
    <section aria-label="Próximos 7 dias" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Semana</h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-sm bg-rec" /> A receber
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-sm bg-pay" /> A pagar
          </span>
          <span>A altura mostra a quantidade de lançamentos</span>
        </p>
      </div>

      <div className="-mx-1 mt-4 overflow-x-auto px-1">
        <ol className="grid min-w-[760px] grid-cols-9 gap-1.5">
          {columns.map((c) => {
            const empty = c.payCount + c.recCount === 0;
            const tone =
              c.kind === "overdue"
                ? "bg-danger-soft"
                : c.kind === "today"
                  ? "bg-sunken ring-1 ring-ink/15"
                  : "";
            const title =
              c.kind === "overdue"
                ? "Atrasados"
                : c.kind === "today"
                  ? "Hoje"
                  : `${c.weekday} ${c.date!.slice(8, 10)}/${c.date!.slice(5, 7)}`;
            const a = amounts(c.rec);
            const b = amounts(c.pay);
            return (
              <li key={c.key} className={`rounded-xl px-2 pb-3 pt-2 ${tone}`}>
                <p
                  className={`text-xs font-medium ${
                    c.kind === "overdue" ? "text-danger" : empty ? "text-muted" : "text-ink"
                  }`}
                >
                  {title}
                </p>

                <div
                  className="relative mt-2 grid h-[96px] grid-rows-2"
                  role="img"
                  aria-label={`${title}: ${c.recCount} a receber, ${c.payCount} a pagar`}
                >
                  <div className="rise flex items-end justify-center">
                    <span
                      className="w-5 rounded-t bg-rec"
                      style={{ height: bar(c.recCount, max) }}
                    />
                  </div>
                  <div className="rise flex items-start justify-center border-t border-ink/20">
                    <span
                      className="w-5 rounded-b bg-pay"
                      style={{ height: bar(c.payCount, max) }}
                    />
                  </div>
                </div>

                <div className="mt-2 min-h-[2.5rem] space-y-0.5 text-[11px] leading-tight tabular-nums">
                  {empty ? (
                    <p className="text-muted">—</p>
                  ) : (
                    <>
                      {a.map((v) => (
                        <p key={`r${v}`} className="text-rec">
                          +{v}
                        </p>
                      ))}
                      {b.map((v) => (
                        <p key={`p${v}`} className="text-pay">
                          −{v}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
