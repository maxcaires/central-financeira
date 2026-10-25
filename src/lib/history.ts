import { formatDateBR } from "./dates.ts";
import { formatMoney, type Currency } from "./money.ts";

export interface ActivityRow {
  id: string;
  table_name: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changes: Record<string, unknown>;
  created_at: string;
}

const FIELD_LABEL: Record<string, string> = {
  description: "descrição",
  payee: "beneficiário",
  debtor_name: "devedor",
  amount: "valor",
  due_date: "vencimento",
  status: "status",
  notes: "observações",
  recurrence: "recorrência",
  entity_id: "entidade",
  contact_phone: "telefone",
  contact_email: "e-mail",
  contact_notes: "observações de contato",
  last_contact_at: "último contato",
  next_action_at: "próxima ação",
  next_action_note: "nota da próxima ação",
};

const SKIP = new Set(["updated_at"]);

function fmtValue(key: string, value: unknown, currency: Currency): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "amount") return formatMoney(Number(value), currency);
  if ((key === "due_date" || key.endsWith("_at")) && typeof value === "string")
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateBR(value) : String(value);
  return String(value);
}

/**
 * Texto curto para uma linha do histórico.
 * `kind` indica se as linhas filhas são pagamentos ("payable") ou recebimentos ("receivable").
 */
export function describeActivity(
  row: ActivityRow,
  currency: Currency,
  statusLabels: Record<string, string>,
  childNoun: "Pagamento" | "Recebimento",
): string {
  const isChild = row.table_name.endsWith("_payments") || row.table_name.endsWith("_receipts");

  if (isChild) {
    const c = row.changes as Record<string, unknown>;
    const amount = formatMoney(Number(c.amount), currency);
    const date = String(c.paid_on ?? c.received_on ?? "");
    const when = /^\d{4}-\d{2}-\d{2}$/.test(date) ? ` em ${formatDateBR(date)}` : "";
    if (row.action === "INSERT") return `${childNoun} registrado: ${amount}${when}`;
    if (row.action === "DELETE") return `${childNoun} removido: ${amount}${when}`;
    return `${childNoun} alterado`;
  }

  if (row.action === "INSERT") return "Lançamento criado";
  if (row.action === "DELETE") return "Lançamento excluído";

  const oldRow = (row.changes.old ?? {}) as Record<string, unknown>;
  const newRow = (row.changes.new ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(newRow)) {
    if (SKIP.has(key) || !(key in FIELD_LABEL)) continue;
    if (JSON.stringify(oldRow[key]) === JSON.stringify(newRow[key])) continue;
    if (key === "status") {
      parts.push(
        `status: ${statusLabels[String(oldRow[key])] ?? oldRow[key]} → ${statusLabels[String(newRow[key])] ?? newRow[key]}`,
      );
    } else if (key === "entity_id") {
      parts.push("entidade alterada");
    } else {
      parts.push(
        `${FIELD_LABEL[key]}: ${fmtValue(key, oldRow[key], currency)} → ${fmtValue(key, newRow[key], currency)}`,
      );
    }
  }
  return parts.length ? `Alterado — ${parts.join("; ")}` : "Lançamento atualizado";
}
