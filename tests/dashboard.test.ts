import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedEntityIds,
  buildBuckets,
  dueForCollection,
  EMPTY_FILTERS,
  hasActiveFilters,
  parseFilters,
  statusesFor,
  totalsByCurrency,
  type DashItem,
} from "../src/lib/dashboard.ts";

const TODAY = "2026-10-26";

function item(over: Partial<DashItem>): DashItem {
  return {
    id: "i",
    description: "x",
    party: "p",
    entity_id: "e1",
    country: "BR",
    currency: "BRL",
    due_date: TODAY,
    balance: 100,
    status: "pending",
    installment_no: null,
    installments_total: null,
    next_action_at: null,
    next_action_note: null,
    ...over,
  };
}

test("buildBuckets: cada item cai em exatamente uma seção", () => {
  const items = [
    item({ id: "a", due_date: "2026-10-25" }), // vencido
    item({ id: "b", due_date: "2026-10-26" }), // hoje
    item({ id: "c", due_date: "2026-10-27" }), // próximos 7
    item({ id: "d", due_date: "2026-11-02" }), // hoje + 7: ainda entra
    item({ id: "e", due_date: "2026-11-03" }), // hoje + 8: fora
  ];
  const b = buildBuckets(items, TODAY);
  assert.deepEqual(b.overdue.map((i) => i.id), ["a"]);
  assert.deepEqual(b.today.map((i) => i.id), ["b"]);
  assert.deepEqual(b.next7.map((i) => i.id), ["c", "d"]);

  const all = [...b.overdue, ...b.today, ...b.next7].map((i) => i.id);
  assert.equal(new Set(all).size, all.length); // nenhuma duplicação
});

test("buildBuckets: ignora saldo zerado e ordena por vencimento", () => {
  const items = [
    item({ id: "z", due_date: "2026-10-20", balance: 0 }),
    item({ id: "n", due_date: "2026-10-10", description: "novo" }),
    item({ id: "o", due_date: "2026-10-01", description: "antigo" }),
  ];
  const b = buildBuckets(items, TODAY);
  assert.deepEqual(b.overdue.map((i) => i.id), ["o", "n"]);
});

test("totalsByCurrency separa BRL e USD", () => {
  const t = totalsByCurrency([
    item({ balance: 10.1 }),
    item({ balance: 20.2 }),
    item({ balance: 5, currency: "USD" }),
  ]);
  assert.deepEqual(t, { BRL: 30.3, USD: 5 });
});

test("dueForCollection: próxima ação hoje ou atrasada, só com saldo", () => {
  const items = [
    item({ id: "a", next_action_at: "2026-10-26" }),
    item({ id: "b", next_action_at: "2026-10-20" }),
    item({ id: "c", next_action_at: "2026-10-27" }), // amanhã: não
    item({ id: "d", next_action_at: null }),
    item({ id: "e", next_action_at: "2026-10-01", balance: 0 }), // quitado: não
  ];
  assert.deepEqual(dueForCollection(items, TODAY).map((i) => i.id), ["b", "a"]);
});

test("parseFilters aceita só valores conhecidos", () => {
  const f = parseFilters({
    entidade: "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9a0b13",
    tipo: "personal",
    pais: "US",
    moeda: "USD",
    situacao: "partial",
  });
  assert.deepEqual(f, {
    entity: "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9a0b13",
    kind: "personal",
    country: "US",
    currency: "USD",
    status: "partial",
  });

  const bad = parseFilters({
    entidade: "' or 1=1 --",
    tipo: "x",
    pais: "BRA",
    moeda: "EUR",
    situacao: ["partial", "none"],
  });
  assert.equal(bad.entity, null);
  assert.equal(bad.kind, null);
  assert.equal(bad.country, null);
  assert.equal(bad.currency, null);
  assert.equal(bad.status, "partial"); // usa o primeiro valor quando repetido
  assert.equal(hasActiveFilters(EMPTY_FILTERS), false);
});

test("allowedEntityIds combina entidade, tipo e país", () => {
  const entities = [
    { id: "e1", kind: "company", country: "BR" },
    { id: "e2", kind: "company", country: "US" },
    { id: "e3", kind: "personal", country: "BR" },
  ];
  assert.equal(allowedEntityIds(entities, EMPTY_FILTERS), null);
  assert.deepEqual(allowedEntityIds(entities, { ...EMPTY_FILTERS, kind: "company" }), ["e1", "e2"]);
  assert.deepEqual(allowedEntityIds(entities, { ...EMPTY_FILTERS, country: "BR" }), ["e1", "e3"]);
  assert.deepEqual(
    allowedEntityIds(entities, { ...EMPTY_FILTERS, kind: "personal", country: "US" }),
    [],
  );
  assert.deepEqual(allowedEntityIds(entities, { ...EMPTY_FILTERS, entity: "e2" }), ["e2"]);
});

test("statusesFor mapeia a situação para os status de cada tabela", () => {
  assert.deepEqual(statusesFor("payable", EMPTY_FILTERS), ["pending", "partially_paid"]);
  assert.deepEqual(statusesFor("receivable", EMPTY_FILTERS), ["open", "partially_received"]);
  assert.deepEqual(statusesFor("payable", { ...EMPTY_FILTERS, status: "partial" }), [
    "partially_paid",
  ]);
  assert.deepEqual(statusesFor("receivable", { ...EMPTY_FILTERS, status: "none" }), ["open"]);
});
