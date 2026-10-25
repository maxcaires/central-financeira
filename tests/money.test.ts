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

import { parseMoneyToCents, splitInstallments } from "../src/lib/money.ts";

test("parseMoneyToCents: formatos brasileiros", () => {
  assert.equal(parseMoneyToCents("1.234,56", "BRL"), 123456);
  assert.equal(parseMoneyToCents("1234,56", "BRL"), 123456);
  assert.equal(parseMoneyToCents("R$ 1.234,56", "BRL"), 123456);
  assert.equal(parseMoneyToCents("1.234", "BRL"), 123400); // ponto de milhar
  assert.equal(parseMoneyToCents("12,5", "BRL"), 1250);
  assert.equal(parseMoneyToCents("12.5", "BRL"), 1250);
  assert.equal(parseMoneyToCents("1.234.567,89", "BRL"), 123456789);
  assert.equal(parseMoneyToCents("0,99", "BRL"), 99);
  assert.equal(parseMoneyToCents(",99", "BRL"), 99);
});

test("parseMoneyToCents: formatos americanos", () => {
  assert.equal(parseMoneyToCents("$1,234.56", "USD"), 123456);
  assert.equal(parseMoneyToCents("1234.56", "USD"), 123456);
  assert.equal(parseMoneyToCents("1,234", "USD"), 123400); // vírgula de milhar
  assert.equal(parseMoneyToCents("350", "USD"), 35000);
});

test("parseMoneyToCents: entradas inválidas", () => {
  assert.equal(parseMoneyToCents("", "BRL"), null);
  assert.equal(parseMoneyToCents("abc", "BRL"), null);
  assert.equal(parseMoneyToCents("1,234,5", "BRL"), null);
  assert.equal(parseMoneyToCents("12,345", "BRL"), null); // 3 casas decimais
});

test("splitInstallments não perde nem cria centavos", () => {
  assert.deepEqual(splitInstallments(10000, 3), [3334, 3333, 3333]);
  assert.deepEqual(splitInstallments(10000, 4), [2500, 2500, 2500, 2500]);
  assert.deepEqual(splitInstallments(1, 3), [1, 0, 0]);
  const parts = splitInstallments(123457, 7);
  assert.equal(parts.reduce((a, b) => a + b, 0), 123457);
});

test("parseMoneyToCents rejeita milhar malformado em vez de adivinhar", () => {
  assert.equal(parseMoneyToCents("1.2.34,56", "BRL"), null);
  assert.equal(parseMoneyToCents("1.234,567,89", "BRL"), null);
  assert.equal(parseMoneyToCents("1,23,456.78", "USD"), null);
  assert.equal(parseMoneyToCents("1.234.567", "BRL"), 123456700);
});
