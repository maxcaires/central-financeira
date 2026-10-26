"use server";

import { flash, requireUser } from "@/lib/auth";
import { isValidIsoDate, todayInZone } from "@/lib/dates";
import { isUuid, parseContactFields, parseEntryForm } from "@/lib/entries";
import { formatMoney, parseMoneyToCents, toCents, type Currency } from "@/lib/money";

const LIST = "/receber";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function createReceivable(formData: FormData) {
  const { supabase } = await requireUser();
  const back = `${LIST}/novo`;

  const parsed = parseEntryForm(formData);
  if (!parsed.ok) flash(back, "erro", parsed.error);
  const contact = parseContactFields(formData);
  if (!contact.ok) flash(back, "erro", contact.error);
  const v = parsed.value;

  const { data: entity } = await supabase
    .from("entities")
    .select("id, country, active")
    .eq("id", v.entityId)
    .maybeSingle();
  if (!entity) flash(back, "erro", "Empresa/categoria não encontrada.");
  if (!entity.active) flash(back, "erro", "Essa empresa/categoria está desativada.");

  const rows = v.rows.map((r) => ({
    entity_id: v.entityId,
    description: v.description,
    debtor_name: v.counterparty,
    amount: r.amount,
    currency: v.currency,
    country: entity.country,
    due_date: r.due_date,
    installment_group_id: v.installmentGroupId,
    installment_no: r.installment_no,
    installments_total: r.installments_total,
    notes: v.notes,
    ...contact.value,
  }));

  const { error } = await supabase.from("receivables").insert(rows);
  if (error) flash(back, "erro", "Não foi possível salvar o valor a receber.");

  flash(
    LIST,
    "ok",
    rows.length > 1 ? `${rows.length} parcelas criadas.` : "Valor a receber criado.",
  );
}

export async function updateReceivable(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Lançamento inválido.");
  const back = `${LIST}/${id}`;

  const { data: current } = await supabase
    .from("receivables")
    .select("id, entity_id, currency")
    .eq("id", id)
    .maybeSingle();
  if (!current) flash(LIST, "erro", "Lançamento não encontrado.");

  // Edição de uma única linha: sem parcelas novas, moeda fixa.
  const copy = new FormData();
  for (const [k, val] of formData.entries()) copy.set(k, val);
  copy.set("currency", current.currency);
  copy.set("installments", "1");
  copy.set("amount_mode", "total");
  copy.set("recurrence", "none");

  const parsed = parseEntryForm(copy);
  if (!parsed.ok) flash(back, "erro", parsed.error);
  const contact = parseContactFields(formData);
  if (!contact.ok) flash(back, "erro", contact.error);
  const v = parsed.value;

  const { data: entity } = await supabase
    .from("entities")
    .select("id, country, active")
    .eq("id", v.entityId)
    .maybeSingle();
  if (!entity) flash(back, "erro", "Empresa/categoria não encontrada.");
  if (!entity.active && entity.id !== current.entity_id)
    flash(back, "erro", "Essa empresa/categoria está desativada.");

  const { error } = await supabase
    .from("receivables")
    .update({
      entity_id: v.entityId,
      description: v.description,
      debtor_name: v.counterparty,
      amount: v.rows[0].amount,
      country: entity.country,
      due_date: v.rows[0].due_date,
      notes: v.notes,
      ...contact.value,
    })
    .eq("id", id);
  if (error) flash(back, "erro", "Não foi possível salvar as alterações.");

  flash(back, "ok", "Alterações salvas.");
}

export async function addReceipt(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Lançamento inválido.");
  const back = `${LIST}/${id}`;

  const { data: r } = await supabase
    .from("receivables_with_balance")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!r) flash(LIST, "erro", "Lançamento não encontrado.");
  if (r.status === "cancelled")
    flash(back, "erro", "Lançamento cancelado. Reative-o antes de registrar recebimento.");

  const currency = r.currency as Currency;
  const cents = parseMoneyToCents(field(formData, "amount"), currency);
  if (cents === null || cents <= 0) flash(back, "erro", "Valor do recebimento inválido.");

  const balanceCents = toCents(Number(r.balance));
  if (cents > balanceCents)
    flash(
      back,
      "erro",
      `O valor é maior que o saldo pendente (${formatMoney(balanceCents / 100, currency)}).`,
    );

  const receivedOn = field(formData, "received_on") || todayInZone();
  if (!isValidIsoDate(receivedOn)) flash(back, "erro", "Data do recebimento inválida.");
  if (receivedOn > todayInZone())
    flash(back, "erro", "A data do recebimento não pode ser futura.");

  const note = field(formData, "note");
  if (note.length > 500) flash(back, "erro", "Anotação muito longa (máx. 500).");

  const { error } = await supabase.from("receivable_receipts").insert({
    receivable_id: id,
    amount: cents / 100,
    received_on: receivedOn,
    note: note || null,
  });
  if (error) flash(back, "erro", "Não foi possível registrar o recebimento.");

  flash(back, "ok", "Recebimento registrado.");
}

export async function deleteReceipt(formData: FormData) {
  const { supabase } = await requireUser();

  const receiptId = field(formData, "receipt_id");
  const id = field(formData, "id");
  if (!isUuid(receiptId) || !isUuid(id)) flash(LIST, "erro", "Recebimento inválido.");
  const back = `${LIST}/${id}`;

  const { error } = await supabase
    .from("receivable_receipts")
    .delete()
    .eq("id", receiptId)
    .eq("receivable_id", id);
  if (error) flash(back, "erro", "Não foi possível remover o recebimento.");

  flash(back, "ok", "Recebimento removido.");
}

export async function setReceivableCancelled(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Lançamento inválido.");
  const cancel = field(formData, "cancel") === "true";
  const back = `${LIST}/${id}`;

  // Ao reativar, o banco recalcula o status real a partir dos recebimentos.
  const { error } = await supabase
    .from("receivables")
    .update({ status: cancel ? "cancelled" : "open" })
    .eq("id", id);
  if (error) flash(back, "erro", "Não foi possível alterar a situação.");

  flash(back, "ok", cancel ? "Lançamento cancelado." : "Lançamento reativado.");
}

export async function deleteReceivable(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Lançamento inválido.");
  const back = `${LIST}/${id}`;

  // Segunda confirmação no servidor: o formulário precisa trazer a marca explícita.
  if (field(formData, "confirm") !== "sim")
    flash(back, "erro", "Confirme a exclusão para continuar.");

  const { data, error } = await supabase.from("receivables").delete().eq("id", id).select("id");
  if (error) flash(back, "erro", "Não foi possível excluir o lançamento.");
  if (!data || data.length === 0) flash(LIST, "erro", "Lançamento não encontrado.");

  flash(LIST, "ok", "Lançamento excluído, junto com seus recebimentos e cobranças.");
}
