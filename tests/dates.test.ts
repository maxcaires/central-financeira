import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  classifyDueDate,
  formatDateBR,
  todayInZone,
} from "../src/lib/dates.ts";

test("addDays atravessa fim de mês e de ano", () => {
  assert.equal(addDays("2026-10-30", 3), "2026-11-02");
  assert.equal(addDays("2026-12-30", 7), "2027-01-06");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("classifyDueDate: cada vencimento cai em exatamente uma seção", () => {
  const today = "2026-10-24";
  assert.equal(classifyDueDate("2026-10-23", today), "overdue");
  assert.equal(classifyDueDate("2026-10-24", today), "today");
  assert.equal(classifyDueDate("2026-10-25", today), "next7");
  assert.equal(classifyDueDate("2026-10-31", today), "next7"); // hoje + 7
  assert.equal(classifyDueDate("2026-11-01", today), "later"); // hoje + 8
});

test("todayInZone usa o fuso informado, não o da máquina", () => {
  // 02:30 UTC de 25/10 ainda é 24/10 à noite em São Paulo (UTC-3).
  const instant = new Date("2026-10-25T02:30:00Z");
  assert.equal(todayInZone("America/Sao_Paulo", instant), "2026-10-24");
  assert.equal(todayInZone("UTC", instant), "2026-10-25");
});

test("08:00 em São Paulo equivale a 11:00 UTC (sem horário de verão)", () => {
  const instant = new Date("2026-10-24T11:00:00Z");
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  assert.equal(hour, "08");
});

test("formatDateBR", () => {
  assert.equal(formatDateBR("2026-01-05"), "05/01/2026");
});

import { addMonths, isValidIsoDate, nextRecurrenceDate } from "../src/lib/dates.ts";

test("addMonths mantém o dia e usa o último dia do mês quando necessário", () => {
  assert.equal(addMonths("2026-01-15", 1), "2026-02-15");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-01-31", 2), "2026-03-31"); // calculado da data inicial: não deriva
  assert.equal(addMonths("2026-11-30", 3), "2027-02-28");
  assert.equal(addMonths("2026-10-24", 12), "2027-10-24");
});

test("nextRecurrenceDate", () => {
  assert.equal(nextRecurrenceDate("2026-10-24", "weekly"), "2026-10-31");
  assert.equal(nextRecurrenceDate("2026-10-31", "monthly"), "2026-11-30");
  assert.equal(nextRecurrenceDate("2028-02-29", "yearly"), "2029-02-28");
});

test("isValidIsoDate", () => {
  assert.equal(isValidIsoDate("2026-02-28"), true);
  assert.equal(isValidIsoDate("2026-02-30"), false);
  assert.equal(isValidIsoDate("26-02-28"), false);
  assert.equal(isValidIsoDate(""), false);
});
