// Linha do tempo do painel: atrasados + hoje + próximos 7 dias, por dia. Lógica pura.

import { addDays } from "./dates.ts";
import { sumByCurrency, type Currency } from "./money.ts";
import type { DashItem } from "./dashboard.ts";

export interface WeekColumn {
  key: string; // "overdue" ou YYYY-MM-DD
  kind: "overdue" | "today" | "day";
  date: string | null;
  weekday: string; // "seg", "ter"...
  payCount: number;
  recCount: number;
  pay: Record<Currency, number>;
  rec: Record<Currency, number>;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function weekdayOf(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
}

/** Dias entre duas datas ISO (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export function buildWeek(
  payables: readonly DashItem[],
  receivables: readonly DashItem[],
  today: string,
): WeekColumn[] {
  const keys = ["overdue", ...Array.from({ length: 8 }, (_, i) => addDays(today, i))];
  const slot = (d: string) => (d < today ? "overdue" : d);

  const cols = keys.map((key, i): { col: WeekColumn; pay: DashItem[]; rec: DashItem[] } => ({
    col: {
      key,
      kind: i === 0 ? "overdue" : i === 1 ? "today" : "day",
      date: i === 0 ? null : key,
      weekday: i === 0 ? "" : weekdayOf(key),
      payCount: 0,
      recCount: 0,
      pay: { BRL: 0, USD: 0 },
      rec: { BRL: 0, USD: 0 },
    },
    pay: [],
    rec: [],
  }));
  const byKey = new Map(cols.map((c) => [c.col.key, c]));

  for (const [list, field] of [
    [payables, "pay"],
    [receivables, "rec"],
  ] as const) {
    for (const item of list) {
      if (!(item.balance > 0)) continue;
      const c = byKey.get(slot(item.due_date));
      if (c) c[field].push(item);
    }
  }
  return cols.map(({ col, pay, rec }) => {
    const toSum = (l: DashItem[]) => sumByCurrency(l.map((i) => ({ amount: i.balance, currency: i.currency })));
    return { ...col, payCount: pay.length, recCount: rec.length, pay: toSum(pay), rec: toSum(rec) };
  });
}
