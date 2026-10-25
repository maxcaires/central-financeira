import { RECURRENCE_LABEL } from "@/lib/labels";
import { ui } from "@/lib/ui";

export interface EntityOption {
  id: string;
  name: string;
  country: string;
}

export interface EntryDefaults {
  entity_id?: string;
  description?: string;
  counterparty?: string;
  amount?: string;
  currency?: string;
  due_date?: string;
  recurrence?: string;
  notes?: string | null;
}

/**
 * Campos compartilhados entre "nova conta a pagar/receber" e a edição.
 * Sem JavaScript no cliente: tudo é enviado pelo formulário.
 */
export function EntryFields({
  entities,
  defaults = {},
  counterpartyLabel,
  mode,
  showRecurrence,
}: {
  entities: EntityOption[];
  defaults?: EntryDefaults;
  counterpartyLabel: string;
  mode: "create" | "edit";
  showRecurrence: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={ui.label}>
        Empresa / categoria
        <select
          name="entity_id"
          required
          defaultValue={defaults.entity_id ?? ""}
          className={ui.input}
        >
          <option value="" disabled>
            Selecione…
          </option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.country === "BR" ? "Brasil" : "EUA"})
            </option>
          ))}
        </select>
      </label>

      <label className={ui.label}>
        {counterpartyLabel}
        <input
          name="counterparty"
          required
          maxLength={120}
          defaultValue={defaults.counterparty}
          className={ui.input}
        />
      </label>

      <label className={`${ui.label} sm:col-span-2`}>
        Descrição
        <input
          name="description"
          required
          maxLength={200}
          defaultValue={defaults.description}
          className={ui.input}
        />
      </label>

      <label className={ui.label}>
        Valor
        <input
          name="amount"
          required
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={defaults.amount}
          className={ui.input}
        />
      </label>

      {mode === "create" ? (
        <label className={ui.label}>
          Moeda
          <select name="currency" defaultValue={defaults.currency ?? "BRL"} className={ui.input}>
            <option value="BRL">BRL — Real</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </label>
      ) : (
        <div className={ui.label}>
          Moeda
          <p className="mt-1 py-2 text-sm">{defaults.currency}</p>
        </div>
      )}

      <label className={ui.label}>
        {mode === "create" ? "Vencimento (1ª parcela)" : "Vencimento"}
        <input
          name="due_date"
          type="date"
          required
          defaultValue={defaults.due_date}
          className={ui.input}
        />
      </label>

      {mode === "create" && (
        <>
          <label className={ui.label}>
            Nº de parcelas
            <input
              name="installments"
              type="number"
              min={1}
              max={60}
              defaultValue={1}
              className={ui.input}
            />
          </label>
          <label className={`${ui.label} sm:col-span-2`}>
            Com mais de uma parcela, o valor informado é
            <select name="amount_mode" defaultValue="total" className={ui.input}>
              <option value="total">o valor total (dividido entre as parcelas)</option>
              <option value="each">o valor de cada parcela</option>
            </select>
            <span className={ui.muted}>
              As parcelas vencem mensalmente a partir da data acima.
            </span>
          </label>
        </>
      )}

      {showRecurrence && (
        <label className={ui.label}>
          Recorrência
          <select
            name="recurrence"
            defaultValue={defaults.recurrence ?? "none"}
            className={ui.input}
          >
            {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className={ui.muted}>
            Ao quitar, o próximo vencimento é criado automaticamente. Não vale com parcelas.
          </span>
        </label>
      )}

      <label className={`${ui.label} sm:col-span-2`}>
        Observações
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={defaults.notes ?? ""}
          className={ui.input}
        />
      </label>
    </div>
  );
}
