import { test } from "node:test";
import assert from "node:assert/strict";
import { sumByCurrency, toCents } from "../src/lib/money.ts";

test("sumByCurrency nunca mistura BRL e USD", () => {
  const totals = sumByCurrency([
    { amount: 100, currency: "BRL" },
    { amount: 50, currency: "USD" },
    { amount: 25.5, currency: "BRL" },
  ]);
  assert.deepEqual(totals, { BRL: 125.5, USD: 50 });
});

test("sumByCurrency evita erro de ponto flutuante", () => {
  const totals = sumByCurrency([
    { amount: 0.1, currency: "BRL" },
    { amount: 0.2, currency: "BRL" },
  ]);
  assert.equal(totals.BRL, 0.3);
});

test("toCents arredonda corretamente", () => {
  assert.equal(toCents(19.99), 1999);
  assert.equal(toCents(1.005 * 100), 10050);
});
