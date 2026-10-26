"use server";

import { flash, requireUser } from "@/lib/auth";
import { formatDateBR, isValidIsoDate, nextRecurrenceDate, todayInZone } from "@/lib/dates";
import { isUuid, parseEntryForm } from "@/lib/entries";
import { formatMoney, parseMoneyToCents, toCents, type Currency } from "@/lib/money";

const LIST = "/pagar";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function createPayable(formData: FormData) {
  const { supabase } = await requireUser();
  const back = `${LIST}/novo`;

  const parsed = parseEntryForm(formData);
  if (!parsed.ok) flash(back, "erro", parsed.error);
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
    payee: v.counterparty,
    amount: r.amount,
    currency: v.currency,
    country: entity.country,
    due_date: r.due_date,
    recurrence: v.recurrence,
    installment_group_id: v.installmentGroupId,
    installment_no: r.installment_no,
    installments_total: r.installments_total,
    notes: v.notes,
  }));

  const { error } = await supabase.from("payables").insert(rows);
  if (error) flash(back, "erro", "Não foi possível salvar a conta a pagar.");

  flash(
    LIST,
    "ok",
    rows.length > 1 ? `${rows.length} parcelas criadas.` : "Conta a pagar criada.",
  );
}

export async function updatePayable(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Conta inválida.");
  const back = `${LIST}/${id}`;

  const { data: current } = await supabase
    .from("payables")
    .select("id, entity_id, currency, installment_group_id")
    .eq("id", id)
    .maybeSingle();
  if (!current) flash(LIST, "erro", "Conta não encontrada.");

  // Edição de uma única linha: sem parcelas novas, moeda fixa.
  const copy = new FormData();
  for (const [k, val] of formData.entries()) copy.set(k, val);
  copy.set("currency", current.currency);
  copy.set("installments", "1");
  copy.set("amount_mode", "total");
  if (current.installment_group_id) copy.set("recurrence", "none");

  const parsed = parseEntryForm(copy);
  if (!parsed.ok) flash(back, "erro", parsed.error);
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
    .from("payables")
    .update({
      entity_id: v.entityId,
      description: v.description,
      payee: v.counterparty,
      amount: v.rows[0].amount,
      country: entity.country,
      due_date: v.rows[0].due_date,
      recurrence: v.recurrence,
      notes: v.notes,
    })
    .eq("id", id);
  if (error) flash(back, "erro", "Não foi possível salvar as alterações.");

  flash(back, "ok", "Alterações salvas.");
}

export async function addPayment(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Conta inválida.");
  const back = `${LIST}/${id}`;

  const { data: p } = await supabase
    .from("payables_with_balance")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!p) flash(LIST, "erro", "Conta não encontrada.");
  if (p.status === "cancelled")
    flash(back, "erro", "Conta cancelada. Reative-a antes de registrar pagamento.");

  const currency = p.currency as Currency;
  const cents = parseMoneyToCents(field(formData, "amount"), currency);
  if (cents === null || cents <= 0) flash(back, "erro", "Valor do pagamento inválido.");

  const balanceCents = toCents(Number(p.balance));
  if (cents > balanceCents)
    flash(
      back,
      "erro",
      `O valor é maior que o saldo pendente (${formatMoney(balanceCents / 100, currency)}).`,
    );

  const paidOn = field(formData, "paid_on") || todayInZone();
  if (!isValidIsoDate(paidOn)) flash(back, "erro", "Data do pagamento inválida.");
  if (paidOn > todayInZone()) flash(back, "erro", "A data do pagamento não pode ser futura.");

  const note = field(formData, "note");
  if (note.length > 500) flash(back, "erro", "Anotação muito longa (máx. 500).");

  const { error } = await supabase.from("payable_payments").insert({
    payable_id: id,
    amount: cents / 100,
    paid_on: paidOn,
    note: note || null,
  });
  if (error) flash(back, "erro", "Não foi possível registrar o pagamento.");

  // Recorrência: ao quitar, cria o próximo vencimento (uma única vez).
  const { data: after } = await supabase
    .from("payables")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  let extra = "";
  if (after && after.status === "paid" && after.recurrence !== "none") {
    const { data: child } = await supabase
      .from("payables")
      .select("id")
      .eq("recurrence_parent_id", id)
      .limit(1)
      .maybeSingle();

    if (!child) {
      const nextDue = nextRecurrenceDate(after.due_date, after.recurrence);
      const { error: nextError } = await supabase.from("payables").insert({
        entity_id: after.entity_id,
        description: after.description,
        payee: after.payee,
        amount: after.amount,
        currency: after.currency,
        country: after.country,
        due_date: nextDue,
        recurrence: after.recurrence,
        recurrence_parent_id: id,
        notes: after.notes,
      });
      extra = nextError
        ? " Atenção: não foi possível criar a próxima recorrência."
        : ` Próximo vencimento criado para ${formatDateBR(nextDue)}.`;
    }
  }

  flash(back, "ok", `Pagamento registrado.${extra}`);
}

export async function deletePayment(formData: FormData) {
  const { supabase } = await requireUser();

  const paymentId = field(formData, "payment_id");
  const id = field(formData, "id");
  if (!isUuid(paymentId) || !isUuid(id)) flash(LIST, "erro", "Pagamento inválido.");
  const back = `${LIST}/${id}`;

  const { error } = await supabase
    .from("payable_payments")
    .delete()
    .eq("id", paymentId)
    .eq("payable_id", id);
  if (error) flash(back, "erro", "Não foi possível remover o pagamento.");

  flash(back, "ok", "Pagamento removido.");
}

export async function setPayableCancelled(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Conta inválida.");
  const cancel = field(formData, "cancel") === "true";
  const back = `${LIST}/${id}`;

  // Ao reativar, o banco recalcula o status real a partir dos pagamentos.
  const { error } = await supabase
    .from("payables")
    .update({ status: cancel ? "cancelled" : "pending" })
    .eq("id", id);
  if (error) flash(back, "erro", "Não foi possível alterar a situação da conta.");

  flash(back, "ok", cancel ? "Conta cancelada." : "Conta reativada.");
}

export async function deletePayable(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Conta inválida.");
  const back = `${LIST}/${id}`;

  // Segunda confirmação no servidor: o formulário precisa trazer a marca explícita.
  if (field(formData, "confirm") !== "sim")
    flash(back, "erro", "Confirme a exclusão para continuar.");

  const { data, error } = await supabase.from("payables").delete().eq("id", id).select("id");
  if (error) flash(back, "erro", "Não foi possível excluir a conta.");
  if (!data || data.length === 0) flash(LIST, "erro", "Conta não encontrada.");

  flash(LIST, "ok", "Conta excluída, junto com seus pagamentos.");
}
