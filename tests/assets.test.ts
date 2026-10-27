import { test } from "node:test";
import assert from "node:assert/strict";
import { groupAssets, parseAssetForm, type AssetRow } from "../src/lib/assets.ts";

function form(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base = { name: "Casa da praia", kind: "real_estate", country: "BR", currency: "BRL", estimated_value: "850.000,00", notes: "" };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}

test("aceita um asset completo e normaliza o valor", () => {
  const r = parseAssetForm(form({ notes: " Escritura em dia " }));
  assert.ok(r.ok);
  assert.equal(r.value.estimated_value, 850000);
  assert.equal(r.value.notes, "Escritura em dia");
});

test("valor é opcional; vazio vira null", () => {
  const r = parseAssetForm(form({ estimated_value: "" }));
  assert.ok(r.ok);
  assert.equal(r.value.estimated_value, null);
});

test("USD usa vírgula como milhar", () => {
  const r = parseAssetForm(form({ country: "US", currency: "USD", estimated_value: "1,250,000.50" }));
  assert.ok(r.ok);
  assert.equal(r.value.estimated_value, 1250000.5);
});

test("rejeita nome vazio, tipo/país/moeda inválidos, valor ruim ou negativo", () => {
  const invalid: Record<string, string>[] = [
    { name: "  " },
    { name: "x".repeat(121) },
    { kind: "boat" },
    { country: "PT" },
    { currency: "EUR" },
    { estimated_value: "abc" },
    { estimated_value: "-10" },
    { estimated_value: "1" + "0".repeat(15) },
    { notes: "x".repeat(2001) },
  ];
  for (const bad of invalid) {
    assert.equal(parseAssetForm(form(bad)).ok, false, JSON.stringify(bad));
  }
});

test("zero é um valor válido", () => {
  const r = parseAssetForm(form({ estimated_value: "0" }));
  assert.ok(r.ok);
  assert.equal(r.value.estimated_value, 0);
});

test("agrupa por país (Brasil primeiro), com totais por moeda e contagem sem valor", () => {
  const rows: AssetRow[] = [
    { id: "1", name: "Carro", kind: "vehicle", country: "BR", currency: "BRL", estimated_value: 80000, notes: null },
    { id: "2", name: "Apto", kind: "real_estate", country: "BR", currency: "BRL", estimated_value: 500000.5, notes: null },
    { id: "3", name: "Terreno", kind: "real_estate", country: "BR", currency: "BRL", estimated_value: null, notes: null },
    { id: "4", name: "Casa", kind: "real_estate", country: "US", currency: "USD", estimated_value: 400000, notes: null },
  ];
  const g = groupAssets(rows);
  assert.deepEqual(g.map((x) => x.country), ["BR", "US"]);
  assert.deepEqual(g[0].rows.map((r) => r.name), ["Apto", "Terreno", "Carro"]); // imóveis antes de carros
  assert.deepEqual(g[0].totals, { BRL: 580000.5, USD: 0 });
  assert.equal(g[0].withoutValue, 1);
  assert.deepEqual(g[1].totals, { BRL: 0, USD: 400000 });
});

test("país sem assets não aparece", () => {
  assert.deepEqual(groupAssets([]), []);
});
