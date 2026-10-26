import { ui } from "@/lib/ui";

export interface ContactDefaults {
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_notes?: string | null;
  last_contact_at?: string | null;
  next_action_at?: string | null;
  next_action_note?: string | null;
}

/** Contato do devedor e controle de cobrança (todos opcionais). */
export function ContactFields({ defaults = {} }: { defaults?: ContactDefaults }) {
  return (
    <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
      <legend className="pr-2 text-sm font-medium">Contato e cobrança (opcional)</legend>
      <label className={ui.label}>
        Telefone
        <input
          name="contact_phone"
          type="tel"
          maxLength={40}
          defaultValue={defaults.contact_phone ?? ""}
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        E-mail do devedor
        <input
          name="contact_email"
          type="email"
          maxLength={254}
          defaultValue={defaults.contact_email ?? ""}
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Último contato
        <input
          name="last_contact_at"
          type="date"
          defaultValue={defaults.last_contact_at ?? ""}
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Próxima ação de cobrança
        <input
          name="next_action_at"
          type="date"
          defaultValue={defaults.next_action_at ?? ""}
          className={ui.input}
        />
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        O que fazer na próxima ação
        <input
          name="next_action_note"
          maxLength={300}
          defaultValue={defaults.next_action_note ?? ""}
          className={ui.input}
        />
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        Observações de contato
        <textarea
          name="contact_notes"
          rows={2}
          maxLength={1000}
          defaultValue={defaults.contact_notes ?? ""}
          className={ui.input}
        />
      </label>
    </fieldset>
  );
}
