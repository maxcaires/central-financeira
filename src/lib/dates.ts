// Datas de vencimento são "datas de calendário" (YYYY-MM-DD), sem horário.
// "Hoje" é sempre calculado no fuso configurado, nunca no fuso da máquina.

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/** Data de hoje (YYYY-MM-DD) no fuso informado. */
export function todayInZone(
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  // O locale en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Soma dias a uma data YYYY-MM-DD (calendário puro, sem influência de fuso). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Soma meses a uma data YYYY-MM-DD mantendo o dia; se o mês de destino for mais curto,
 * usa o último dia dele (31/jan + 1 mês = 28 ou 29/fev). Para séries de parcelas,
 * sempre calcule a partir da data inicial (e não da parcela anterior), para o dia não "derivar".
 */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Valida o formato YYYY-MM-DD e que a data existe no calendário. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

/** Próxima data de uma conta recorrente. */
export function nextRecurrenceDate(
  isoDate: string,
  recurrence: "weekly" | "monthly" | "yearly",
): string {
  if (recurrence === "weekly") return addDays(isoDate, 7);
  if (recurrence === "monthly") return addMonths(isoDate, 1);
  return addMonths(isoDate, 12);
}

/** Formata YYYY-MM-DD como DD/MM/AAAA. */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export type DueBucket = "overdue" | "today" | "next7" | "later";

/**
 * Classifica um vencimento em exatamente uma seção.
 * Garante a regra de "nenhuma duplicação entre as seções".
 */
export function classifyDueDate(dueDate: string, today: string): DueBucket {
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate <= addDays(today, 7)) return "next7";
  return "later";
}
