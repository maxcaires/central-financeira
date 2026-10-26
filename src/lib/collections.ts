// Registro de contatos de cobrança: validação e regras puras (sem Next/Supabase).

import { isValidIsoDate } from "./dates.ts";

export const CHANNELS = ["phone", "whatsapp", "email", "in_person", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ContactLogInput {
  contacted_on: string; // YYYY-MM-DD
  channel: Channel | null;
  note: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
}

export type ContactLogResult =
  | { ok: true; value: ContactLogInput }
  | { ok: false; error: string };

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/**
 * Lê o formulário "registrar contato".
 * Regras: a data do contato não pode ser futura; a próxima ação (opcional) não pode ser anterior
 * ao contato; uma nota de próxima ação exige a data. Deixar a próxima ação em branco encerra a pendência.
 */
export function parseContactLog(formData: FormData, today: string): ContactLogResult {
  const contactedOn = text(formData, "contacted_on") || today;
  const channel = text(formData, "channel");
  const note = text(formData, "note");
  const nextAt = text(formData, "next_action_at");
  const nextNote = text(formData, "next_action_note");

  if (!isValidIsoDate(contactedOn)) return { ok: false, error: "Data do contato inválida." };
  if (contactedOn > today) return { ok: false, error: "A data do contato não pode ser futura." };
  if (channel && !(CHANNELS as readonly string[]).includes(channel))
    return { ok: false, error: "Canal inválido." };
  if (note.length > 1000) return { ok: false, error: "Anotação muito longa (máx. 1000)." };
  if (nextAt && !isValidIsoDate(nextAt))
    return { ok: false, error: "Data da próxima ação inválida." };
  if (nextAt && nextAt < contactedOn)
    return { ok: false, error: "A próxima ação não pode ser anterior à data do contato." };
  if (nextNote.length > 300)
    return { ok: false, error: "Nota da próxima ação muito longa (máx. 300)." };
  if (nextNote && !nextAt)
    return { ok: false, error: "Informe a data da próxima ação (ou apague a nota dela)." };
  if (!note && !channel && !nextAt)
    return { ok: false, error: "Informe ao menos o canal, uma anotação ou a próxima ação." };

  return {
    ok: true,
    value: {
      contacted_on: contactedOn,
      channel: (channel as Channel) || null,
      note: note || null,
      next_action_at: nextAt || null,
      next_action_note: nextNote || null,
    },
  };
}

/** O "último contato" nunca recua: vale o mais recente entre o atual e o novo. */
export function latestContact(current: string | null, contactedOn: string): string {
  return current && current > contactedOn ? current : contactedOn;
}
