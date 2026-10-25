import type { Currency } from "@/lib/money";

export type Country = "BR" | "US";
export type EntityKind = "company" | "personal";

export type PayableStatus = "pending" | "partially_paid" | "paid" | "cancelled";
export type ReceivableStatus =
  | "open"
  | "partially_received"
  | "received"
  | "cancelled";

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  country: Country;
  active: boolean;
}

export interface Payable {
  id: string;
  entity_id: string;
  description: string;
  payee: string;
  amount: number;
  currency: Currency;
  country: Country;
  due_date: string; // YYYY-MM-DD
  status: PayableStatus;
  recurrence: Recurrence;
  recurrence_parent_id: string | null;
  installment_group_id: string | null;
  installment_no: number | null;
  installments_total: number | null;
  notes: string | null;
}

export interface Receivable {
  id: string;
  entity_id: string;
  description: string;
  debtor_name: string;
  amount: number;
  currency: Currency;
  country: Country;
  due_date: string; // YYYY-MM-DD
  status: ReceivableStatus;
  contact_phone: string | null;
  contact_email: string | null;
  contact_notes: string | null;
  last_contact_at: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
  installment_group_id: string | null;
  installment_no: number | null;
  installments_total: number | null;
  notes: string | null;
}
