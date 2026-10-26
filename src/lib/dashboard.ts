// Lógica pura do painel: sem Next, sem Supabase. Reaproveitada pelo resumo diário (Etapa 6).

import { addDays, classifyDueDate } from "./dates.ts";
import { sumByCurrency, type Currency } from "./money.ts";

export interface DashItem {
  id: string;
  description: string;
  party: string; // beneficiário ou devedor
  entity_id: string;
  country: string;
  currency: Currency;
  due_date: string; // YYYY-MM-DD
  balance: number; // saldo pendente, na moeda do item
  status: string;
  installment_no: number | null;
  installments_total: number | null;
  next_action_at: string | null;
  next_action_note: string | null;
}

export interface Buckets {
  overdue: DashItem[];
  today: DashItem[];
  next7: DashItem[];
}

/**
 * Distribui cada item em exatamente uma seção (vencido, hoje ou próximos 7 dias).
 * Itens com saldo zerado ou vencimento além de 7 dias ficam de fora.
 * Cada lista sai ordenada por vencimento e, no empate, por descrição.
 */
export function buildBuckets(items: readonly DashItem[], today: string): Buckets {
  const out: Buckets = { overdue: [], today: [], next7: [] };
  for (const item of items) {
    if (!(item.balance > 0)) continue;
    const bucket = classifyDueDate(item.due_date, today);
    if (bucket === "later") continue;
    out[bucket].push(item);
  }
  const byDue = (a: DashItem, b: DashItem) =>
    a.due_date.localeCompare(b.due_date) || a.description.localeCompare(b.description, "pt-BR");
  out.overdue.sort(byDue);
  out.today.sort(byDue);
  out.next7.sort(byDue);
  return out;
}

/** Soma de saldos por moeda. Reais e dólares nunca se misturam. */
export function totalsByCurrency(items: readonly DashItem[]): Record<Currency, number> {
  return sumByCurrency(items.map((i) => ({ amount: i.balance, currency: i.currency })));
}

/** Último dia (inclusive) que o painel busca: hoje + 7. */
export function horizonEnd(today: string): string {
  return addDays(today, 7);
}

/** Itens a receber com próxima ação de cobrança para hoje ou atrasada. */
export function dueForCollection(items: readonly DashItem[], today: string): DashItem[] {
  return items
    .filter((i) => i.balance > 0 && i.next_action_at !== null && i.next_action_at <= today)
    .sort(
      (a, b) =>
        (a.next_action_at ?? "").localeCompare(b.next_action_at ?? "") ||
        a.description.localeCompare(b.description, "pt-BR"),
    );
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

export interface Filters {
  entity: string | null; // id (uuid) de uma entidade
  kind: "company" | "personal" | null;
  country: "BR" | "US" | null;
  currency: Currency | null;
  status: "none" | "partial" | null; // sem pagamento ainda | parcialmente pago/recebido
}

export const EMPTY_FILTERS: Filters = {
  entity: null,
  kind: null,
  country: null,
  currency: null,
  status: null,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Lê os filtros da query string aceitando só valores conhecidos; o resto vira "sem filtro". */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): Filters {
  const entity = first(params.entidade);
  const kind = first(params.tipo);
  const country = first(params.pais);
  const currency = first(params.moeda);
  const status = first(params.situacao);
  return {
    entity: UUID_RE.test(entity) ? entity : null,
    kind: kind === "company" || kind === "personal" ? kind : null,
    country: country === "BR" || country === "US" ? country : null,
    currency: currency === "BRL" || currency === "USD" ? currency : null,
    status: status === "none" || status === "partial" ? status : null,
  };
}

export function hasActiveFilters(f: Filters): boolean {
  return Object.values(f).some((v) => v !== null);
}

export interface EntityRef {
  id: string;
  kind: string;
  country: string;
}

/**
 * Ids de entidades que atendem ao filtro de entidade, tipo e país.
 * Retorna null quando nenhum desses filtros está ativo (não precisa restringir a consulta).
 */
export function allowedEntityIds(
  entities: readonly EntityRef[],
  f: Filters,
): string[] | null {
  if (!f.entity && !f.kind && !f.country) return null;
  return entities
    .filter(
      (e) =>
        (!f.entity || e.id === f.entity) &&
        (!f.kind || e.kind === f.kind) &&
        (!f.country || e.country === f.country),
    )
    .map((e) => e.id);
}

/** Status do banco que correspondem ao filtro de situação. */
export function statusesFor(
  kind: "payable" | "receivable",
  f: Filters,
): string[] {
  const none = kind === "payable" ? "pending" : "open";
  const partial = kind === "payable" ? "partially_paid" : "partially_received";
  if (f.status === "none") return [none];
  if (f.status === "partial") return [partial];
  return [none, partial];
}
