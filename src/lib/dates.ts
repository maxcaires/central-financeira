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
