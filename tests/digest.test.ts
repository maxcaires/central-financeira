import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigest } from "../src/lib/digest/build.ts";
import type { DashItem } from "../src/lib/dashboard.ts";

const TODAY = "2026-10-26";
const NAMES = { e1: "Empresa A", e2: "Empresa B", e3: "Pessoal Brasil" };

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

test("sempre devolve as 3 seções, na ordem, e o assunto reflete as contagens", () => {
  const d = buildDigest({
    today: TODAY,
    payables: [
      item({ id: "p1", due_date: "2026-10-20" }),
      item({ id: "p2", due_date: TODAY }),
    ],
    receivables: [item({ id: "r1", due_date: "2026-10-28" })],
    entityNames: NAMES,
  });
  assert.deepEqual(d.sections.map((s) => s.key), ["overdue", "today", "next7"]);
  assert.deepEqual(d.counts, { overdue: 1, today: 1, next7: 1 });
  assert.equal(d.isEmpty, false);
  assert.equal(d.subject, "Central Financeira 26/10: 1 vencidos · 1 hoje · 1 nos próximos 7 dias");
  assert.equal(d.until, "2026-11-02");
});

test("nenhum item aparece em mais de uma seção nem fora das janelas", () => {
  const payables = [
    item({ id: "a", due_date: "2026-10-25" }),
    item({ id: "b", due_date: "2026-10-26" }),
    item({ id: "c", due_date: "2026-11-02" }),
    item({ id: "d", due_date: "2026-11-03" }), // fora
    item({ id: "e", due_date: "2026-10-01", balance: 0 }), // quitado
  ];
  const d = buildDigest({ today: TODAY, payables, receivables: [], entityNames: NAMES });
  const ids = d.sections.flatMap((s) =>
    s.groups.flatMap((g) => [...g.payables, ...g.receivables].map((i) => i.id)),
  );
  assert.deepEqual(ids.sort(), ["a", "b", "c"]);
  assert.equal(new Set(ids).size, ids.length);
});

test("agrupa por empresa, país e moeda; totais nunca misturam moedas", () => {
  const d = buildDigest({
    today: TODAY,
    payables: [
      item({ id: "1", entity_id: "e1", currency: "BRL", balance: 10.1 }),
      item({ id: "2", entity_id: "e1", currency: "BRL", balance: 20.2 }),
      item({ id: "3", entity_id: "e2", country: "US", currency: "USD", balance: 5 }),
    ],
    receivables: [item({ id: "4", entity_id: "e1", currency: "BRL", balance: 7 })],
    entityNames: NAMES,
  });
  const today = d.sections[1];
  assert.equal(today.groups.length, 2);
  const [a, b] = today.groups;
  assert.deepEqual([a.entityName, a.country, a.currency], ["Empresa A", "BR", "BRL"]);
  assert.equal(a.payTotal, 30.3);
  assert.equal(a.recTotal, 7);
  assert.deepEqual([b.entityName, b.country, b.currency], ["Empresa B", "US", "USD"]);
  assert.equal(b.payTotal, 5);
  assert.deepEqual(today.payTotals, { BRL: 30.3, USD: 5 });
  assert.deepEqual(today.recTotals, { BRL: 7, USD: 0 });
});

test("mesma empresa em duas moedas gera dois grupos", () => {
  const d = buildDigest({
    today: TODAY,
    payables: [
      item({ id: "1", currency: "BRL" }),
      item({ id: "2", currency: "USD" }),
    ],
    receivables: [],
    entityNames: NAMES,
  });
  assert.deepEqual(d.sections[1].groups.map((g) => g.currency), ["BRL", "USD"]);
});

test("ação de cobrança vira anotação no próprio item, sem criar linha extra", () => {
  const d = buildDigest({
    today: TODAY,
    payables: [],
    receivables: [
      item({ id: "r1", due_date: "2026-10-20", next_action_at: TODAY, next_action_note: "Ligar" }),
      item({ id: "r2", due_date: "2026-10-20", next_action_at: "2026-10-30" }), // futura: sem anotação
    ],
    entityNames: NAMES,
  });
  const items = d.sections[0].groups[0].receivables;
  assert.equal(items.length, 2);
  assert.deepEqual(items.find((i) => i.id === "r1")?.collection, { at: TODAY, note: "Ligar" });
  assert.equal(items.find((i) => i.id === "r2")?.collection, null);
});

test("sem nada pendente: resumo vazio mas ainda gerado (envia 'nada pendente')", () => {
  const d = buildDigest({ today: TODAY, payables: [], receivables: [], entityNames: NAMES });
  assert.equal(d.isEmpty, true);
  assert.equal(d.subject, "Central Financeira 26/10: nada pendente");
  assert.deepEqual(d.sections.map((s) => s.groups.length), [0, 0, 0]);
});

test("entidade desconhecida e parcelas", () => {
  const d = buildDigest({
    today: TODAY,
    payables: [item({ entity_id: "zzz", installment_no: 2, installments_total: 3 })],
    receivables: [],
    entityNames: NAMES,
  });
  const g = d.sections[1].groups[0];
  assert.equal(g.entityName, "Sem nome");
  assert.equal(g.payables[0].installment, "2/3");
});

test("repassa o aviso de lista truncada", () => {
  const d = buildDigest({ today: TODAY, payables: [], receivables: [], entityNames: NAMES, truncated: true });
  assert.equal(d.truncated, true);
});

import { escapeHtml, renderHtml, renderText } from "../src/lib/digest/render.ts";

test("HTML escapa texto do usuário (sem injeção)", () => {
  const evil = `<script>alert(1)</script> "x" & 'y'`;
  const d = buildDigest({
    today: TODAY,
    payables: [item({ description: evil, party: "<img src=x onerror=1>" })],
    receivables: [item({ id: "r", description: "ok", next_action_at: TODAY, next_action_note: "<b>ligar</b>" })],
    entityNames: { e1: "<i>Empresa</i>" },
  });
  const html = renderHtml(d);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<i>Empresa"));
  assert.ok(!html.includes("<b>ligar"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.equal(escapeHtml(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
});

test("render vazio diz 'Nada pendente' em HTML e texto", () => {
  const d = buildDigest({ today: TODAY, payables: [], receivables: [], entityNames: NAMES });
  assert.ok(renderHtml(d).includes("Nada pendente"));
  assert.ok(renderText(d).includes("Nada pendente."));
});

test("render mostra moedas separadas, parcela, cobrança e aviso de truncamento", () => {
  const d = buildDigest({
    today: TODAY,
    payables: [
      item({ id: "1", balance: 1500.5, installment_no: 2, installments_total: 3 }),
      item({ id: "2", currency: "USD", country: "US", balance: 20, entity_id: "e2" }),
    ],
    receivables: [item({ id: "3", next_action_at: TODAY, next_action_note: "Ligar" })],
    entityNames: NAMES,
    truncated: true,
  });
  const txt = renderText(d);
  assert.ok(txt.includes("R$"));
  assert.ok(txt.includes("$20.00"));
  assert.ok(txt.includes("parcela 2/3"));
  assert.ok(txt.includes("Cobrar:"));
  assert.ok(txt.includes("incompleta"));
  assert.ok(renderHtml(d).includes("incompleta"));
  assert.ok(txt.includes("1.500,50"));
});
