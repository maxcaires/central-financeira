import { test } from "node:test";
import assert from "node:assert/strict";
import { latestContact, parseContactLog } from "../src/lib/collections.ts";

const TODAY = "2026-10-26";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

test("contato completo com próxima ação", () => {
  const r = parseContactLog(
    form({
      contacted_on: "2026-10-25",
      channel: "whatsapp",
      note: " Pediu mais prazo ",
      next_action_at: "2026-11-02",
      next_action_note: "Ligar",
    }),
    TODAY,
  );
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    contacted_on: "2026-10-25",
    channel: "whatsapp",
    note: "Pediu mais prazo",
    next_action_at: "2026-11-02",
    next_action_note: "Ligar",
  });
});

test("data em branco usa hoje; sem próxima ação encerra a pendência", () => {
  const r = parseContactLog(form({ channel: "phone" }), TODAY);
  assert.ok(r.ok);
  assert.equal(r.value.contacted_on, TODAY);
  assert.equal(r.value.next_action_at, null);
  assert.equal(r.value.next_action_note, null);
});

test("só a próxima ação já basta (agendar sem ter contatado)", () => {
  const r = parseContactLog(form({ next_action_at: "2026-10-30" }), TODAY);
  assert.ok(r.ok);
  assert.equal(r.value.channel, null);
  assert.equal(r.value.note, null);
});

test("rejeita entradas inválidas", () => {
  const bad = (fields: Record<string, string>) =>
    assert.equal(parseContactLog(form(fields), TODAY).ok, false);
  bad({}); // vazio
  bad({ channel: "phone", contacted_on: "2026-10-27" }); // futuro
  bad({ channel: "phone", contacted_on: "2026-02-30" }); // inexistente
  bad({ channel: "pombo-correio" });
  bad({ channel: "phone", next_action_at: "2026-10-01" }); // antes do contato
  bad({ channel: "phone", next_action_at: "amanhã" });
  bad({ channel: "phone", next_action_note: "Ligar" }); // nota sem data
  bad({ note: "x".repeat(1001) });
  bad({ channel: "phone", next_action_at: "2026-11-01", next_action_note: "x".repeat(301) });
});

test("latestContact nunca recua", () => {
  assert.equal(latestContact(null, "2026-10-20"), "2026-10-20");
  assert.equal(latestContact("2026-10-10", "2026-10-20"), "2026-10-20");
  assert.equal(latestContact("2026-10-25", "2026-10-20"), "2026-10-25");
});
