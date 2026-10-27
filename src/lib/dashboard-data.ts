import type { SupabaseClient } from "@supabase/supabase-js";
import {
  horizonEnd,
  statusesFor,
  type DashItem,
  type Filters,
} from "@/lib/dashboard";
import type { Currency } from "@/lib/money";

export const DASH_LIMIT = 500;

export interface LoadResult {
  items: DashItem[];
  failed: boolean;
  truncated: boolean;
}

type Row = Record<string, unknown>;

function toItem(row: Row, partyKey: "payee" | "debtor_name"): DashItem {
  return {
    id: String(row.id),
    description: String(row.description),
    party: String(row[partyKey]),
    entity_id: String(row.entity_id),
    country: String(row.country),
    currency: row.currency as Currency,
    due_date: String(row.due_date),
    balance: Number(row.balance),
    status: String(row.status),
    installment_no: (row.installment_no as number | null) ?? null,
    installments_total: (row.installments_total as number | null) ?? null,
    next_action_at: (row.next_action_at as string | null) ?? null,
    next_action_note: (row.next_action_note as string | null) ?? null,
  };
}

const EMPTY: LoadResult = { items: [], failed: false, truncated: false };

/**
 * Itens em aberto de um tipo, com vencimento até hoje + 7 (vencidos incluídos).
 * `entityIds` = null significa sem restrição; lista vazia significa nenhum resultado.
 */
export async function loadDueItems(
  supabase: SupabaseClient,
  kind: "payable" | "receivable",
  filters: Filters,
  entityIds: string[] | null,
  today: string,
  ownerId?: string, // só para o cliente de servidor (service_role), que ignora a RLS
): Promise<LoadResult> {
  if (entityIds && entityIds.length === 0) return EMPTY;

  const isPay = kind === "payable";
  let q = supabase
    .from(isPay ? "payables_with_balance" : "receivables_with_balance")
    .select(
      isPay
        ? "id, description, payee, entity_id, country, currency, due_date, balance, status, installment_no, installments_total"
        : "id, description, debtor_name, entity_id, country, currency, due_date, balance, status, installment_no, installments_total, next_action_at, next_action_note",
    )
    .in("status", statusesFor(kind, filters))
    .lte("due_date", horizonEnd(today))
    .order("due_date", { ascending: true })
    .limit(DASH_LIMIT);

  if (entityIds) q = q.in("entity_id", entityIds);
  if (filters.currency) q = q.eq("currency", filters.currency);
  if (ownerId) q = q.eq("owner_id", ownerId);

  const { data, error } = await q;
  if (error || !data) return { items: [], failed: true, truncated: false };

  const rows = data as unknown as Row[];
  return {
    items: rows.map((r) => toItem(r, isPay ? "payee" : "debtor_name")),
    failed: false,
    truncated: rows.length >= DASH_LIMIT,
  };
}

/** A receber com próxima ação de cobrança para hoje ou atrasada (qualquer vencimento). */
export async function loadCollections(
  supabase: SupabaseClient,
  filters: Filters,
  entityIds: string[] | null,
  today: string,
): Promise<LoadResult> {
  if (entityIds && entityIds.length === 0) return EMPTY;

  let q = supabase
    .from("receivables_with_balance")
    .select(
      "id, description, debtor_name, entity_id, country, currency, due_date, balance, status, installment_no, installments_total, next_action_at, next_action_note",
    )
    .in("status", statusesFor("receivable", filters))
    .not("next_action_at", "is", null)
    .lte("next_action_at", today)
    .order("next_action_at", { ascending: true })
    .limit(DASH_LIMIT);

  if (entityIds) q = q.in("entity_id", entityIds);
  if (filters.currency) q = q.eq("currency", filters.currency);

  const { data, error } = await q;
  if (error || !data) return { items: [], failed: true, truncated: false };

  const rows = data as unknown as Row[];
  return {
    items: rows.map((r) => toItem(r, "debtor_name")),
    failed: false,
    truncated: rows.length >= DASH_LIMIT,
  };
}
