// Leitura e validação do formulário de novo lançamento (a pagar e a receber compartilham as regras).
// Sem dependências de Next/Supabase, para poder ser testado isoladamente.

import { addMonths, isValidIsoDate } from "./dates.ts";
import { CURRENCIES, parseMoneyToCents, splitInstallments, type Currency } from "./money.ts";

export const RECURRENCES = ["none", "weekly", "monthly", "yearly"] as const;
export type RecurrenceValue = (typeof RECURRENCES)[number];

export const MAX_INSTALLMENTS = 60;

export interface EntryRow {
  amount: number; // em unidades da moeda (ex.: 1234.56)
  due_date: string; // YYYY-MM-DD
  installment_no: number | null;
  installments_total: number | null;
}

export interface ParsedEntryForm {
  entityId: string;
  description: string;
  counterparty: string;
  currency: Currency;
  notes: string | null;
  recurrence: RecurrenceValue;
  installmentGroupId: string | null;
  rows: EntryRow[];
}

export type ParseResult =
  | { ok: true; value: ParsedEntryForm }
  | { ok: false; error: string };

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Monta as linhas (uma por parcela) a partir do valor, da 1ª data e do número de parcelas. */
export function buildRows(
  totalOrEachCents: number,
  mode: "total" | "each",
  firstDueDate: string,
  installments: number,
): EntryRow[] | null {
  const cents =
    installments === 1
      ? [totalOrEachCents]
      : mode === "each"
        ? Array.from({ length: installments }, () => totalOrEachCents)
        : splitInstallments(totalOrEachCents, installments);

  if (cents.some((c) => c <= 0)) return null;

  return cents.map((c, i) => ({
    amount: c / 100,
    // Sempre calculado a partir da 1ª data, para o dia do mês não "derivar".
    due_date: addMonths(firstDueDate, i),
    installment_no: installments > 1 ? i + 1 : null,
    installments_total: installments > 1 ? installments : null,
  }));
}

export function parseEntryForm(
  formData: FormData,
  newGroupId: () => string = () => crypto.randomUUID(),
): ParseResult {
  const entityId = text(formData, "entity_id");
  const description = text(formData, "description");
  const counterparty = text(formData, "counterparty");
  const currency = text(formData, "currency");
  const dueDate = text(formData, "due_date");
  const notes = text(formData, "notes");
  const recurrence = text(formData, "recurrence") || "none";
  const mode = text(formData, "amount_mode") === "each" ? "each" : "total";
  const installments = Number(text(formData, "installments") || "1");

  if (!entityId) return { ok: false, error: "Escolha a empresa ou categoria pessoal." };
  if (!description) return { ok: false, error: "Informe a descrição." };
  if (description.length > 200) return { ok: false, error: "Descrição muito longa (máx. 200)." };
  if (!counterparty) return { ok: false, error: "Informe o nome da outra parte." };
  if (counterparty.length > 120) return { ok: false, error: "Nome muito longo (máx. 120)." };
  if (notes.length > 2000) return { ok: false, error: "Observações muito longas (máx. 2000)." };
  if (!(CURRENCIES as readonly string[]).includes(currency))
    return { ok: false, error: "Moeda inválida." };
  if (!isValidIsoDate(dueDate)) return { ok: false, error: "Data de vencimento inválida." };
  if (!(RECURRENCES as readonly string[]).includes(recurrence))
    return { ok: false, error: "Recorrência inválida." };
  if (!Number.isInteger(installments) || installments < 1 || installments > MAX_INSTALLMENTS)
    return { ok: false, error: `Número de parcelas deve ser de 1 a ${MAX_INSTALLMENTS}.` };
  if (installments > 1 && recurrence !== "none")
    return { ok: false, error: "Use parcelas ou recorrência, não os dois ao mesmo tempo." };

  const cents = parseMoneyToCents(text(formData, "amount"), currency as Currency);
  if (cents === null || cents <= 0) return { ok: false, error: "Valor inválido." };

  const rows = buildRows(cents, mode, dueDate, installments);
  if (!rows) return { ok: false, error: "O valor é pequeno demais para dividir nessas parcelas." };

  return {
    ok: true,
    value: {
      entityId,
      description,
      counterparty,
      currency: currency as Currency,
      notes: notes || null,
      recurrence: recurrence as RecurrenceValue,
      installmentGroupId: installments > 1 ? newGroupId() : null,
      rows,
    },
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export interface ContactFields {
  contact_phone: string | null;
  contact_email: string | null;
  contact_notes: string | null;
  last_contact_at: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
}

export type ContactParseResult =
  | { ok: true; value: ContactFields }
  | { ok: false; error: string };

/** Campos opcionais de contato/cobrança de uma conta a receber. */
export function parseContactFields(formData: FormData): ContactParseResult {
  const phone = text(formData, "contact_phone");
  const email = text(formData, "contact_email");
  const contactNotes = text(formData, "contact_notes");
  const lastContact = text(formData, "last_contact_at");
  const nextAction = text(formData, "next_action_at");
  const nextActionNote = text(formData, "next_action_note");

  if (phone.length > 40) return { ok: false, error: "Telefone muito longo (máx. 40)." };
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return { ok: false, error: "E-mail de contato inválido." };
  if (contactNotes.length > 1000)
    return { ok: false, error: "Observações de contato muito longas (máx. 1000)." };
  if (lastContact && !isValidIsoDate(lastContact))
    return { ok: false, error: "Data do último contato inválida." };
  if (nextAction && !isValidIsoDate(nextAction))
    return { ok: false, error: "Data da próxima ação inválida." };
  if (nextActionNote.length > 300)
    return { ok: false, error: "Nota da próxima ação muito longa (máx. 300)." };

  return {
    ok: true,
    value: {
      contact_phone: phone || null,
      contact_email: email || null,
      contact_notes: contactNotes || null,
      last_contact_at: lastContact || null,
      next_action_at: nextAction || null,
      next_action_note: nextActionNote || null,
    },
  };
}
