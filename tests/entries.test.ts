import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRows, parseEntryForm } from "../src/lib/entries.ts";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    entity_id: "ent-1",
    description: "Aluguel",
    counterparty: "Imobiliária",
    amount: "1.000,00",
    currency: "BRL",
    due_date: "2026-10-31",
    installments: "1",
    amount_mode: "total",
    recurrence: "none",
  };
  for (const [k, v] of Object.entries({ ...base, ...fields })) fd.set(k, v);
  return fd;
}

test("lançamento simples gera uma linha sem dados de parcela", () => {
  const r = parseEntryForm(form({}));
  assert.ok(r.ok);
  assert.equal(r.value.rows.length, 1);
  assert.deepEqual(r.value.rows[0], {
    amount: 1000,
    due_date: "2026-10-31",
    installment_no: null,
    installments_total: null,
  });
  assert.equal(r.value.installmentGroupId, null);
});

test("parcelas: total dividido sem perder centavos e vencimentos mensais sem derivar", () => {
  const r = parseEntryForm(
    form({ amount: "100,00", installments: "3", due_date: "2026-01-31" }),
    () => "grupo-1",
  );
  assert.ok(r.ok);
  assert.deepEqual(
    r.value.rows.map((x) => [x.amount, x.due_date, x.installment_no, x.installments_total]),
    [
      [33.34, "2026-01-31", 1, 3],
      [33.33, "2026-02-28", 2, 3],
      [33.33, "2026-03-31", 3, 3],
    ],
  );
  assert.equal(r.value.installmentGroupId, "grupo-1");
});

test("parcelas: valor de cada parcela", () => {
  const r = parseEntryForm(form({ amount: "250,00", installments: "4", amount_mode: "each" }));
  assert.ok(r.ok);
  assert.deepEqual(r.value.rows.map((x) => x.amount), [250, 250, 250, 250]);
});

test("validações", () => {
  const bad = (fields: Record<string, string>) => {
    const r = parseEntryForm(form(fields));
    assert.equal(r.ok, false);
  };
  bad({ entity_id: "" });
  bad({ description: "  " });
  bad({ counterparty: "" });
  bad({ currency: "EUR" });
  bad({ due_date: "2026-02-30" });
  bad({ amount: "0" });
  bad({ amount: "abc" });
  bad({ installments: "0" });
  bad({ installments: "61" });
  bad({ installments: "1.5" });
  bad({ recurrence: "daily" });
  bad({ installments: "3", recurrence: "monthly" }); // parcelas + recorrência
  bad({ amount: "0,02", installments: "3" }); // parcela de 0 centavo
});

test("buildRows rejeita parcela de zero centavo", () => {
  assert.equal(buildRows(2, "total", "2026-01-01", 3), null);
});

test("moeda USD interpreta o valor no formato americano", () => {
  const r = parseEntryForm(form({ currency: "USD", amount: "$1,234.56" }));
  assert.ok(r.ok);
  assert.equal(r.value.rows[0].amount, 1234.56);
});

import { isUuid } from "../src/lib/entries.ts";

test("isUuid", () => {
  assert.equal(isUuid("3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9a0b13"), true);
  assert.equal(isUuid("../etc/passwd"), false);
  assert.equal(isUuid(""), false);
});

import { parseContactFields } from "../src/lib/entries.ts";

test("parseContactFields: tudo opcional e normalizado para null", () => {
  const r = parseContactFields(new FormData());
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    contact_phone: null,
    contact_email: null,
    contact_notes: null,
    last_contact_at: null,
    next_action_at: null,
    next_action_note: null,
  });
});

test("parseContactFields: valida e-mail e datas", () => {
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  assert.equal(parseContactFields(fd({ contact_email: "sem-arroba" })).ok, false);
  assert.equal(parseContactFields(fd({ next_action_at: "2026-13-01" })).ok, false);
  assert.equal(parseContactFields(fd({ last_contact_at: "ontem" })).ok, false);
  const ok = parseContactFields(
    fd({ contact_email: "a@b.com", next_action_at: "2026-11-02", contact_phone: " 11 99999-0000 " }),
  );
  assert.ok(ok.ok);
  assert.equal(ok.value.contact_phone, "11 99999-0000");
});
