import { ASSET_KIND_LABEL, ASSET_KINDS } from "@/lib/assets";
import { ui } from "@/lib/ui";

export interface AssetDefaults {
  name?: string;
  kind?: string;
  country?: string;
  currency?: string;
  estimated_value?: string;
  notes?: string | null;
}

/** Campos do formulário de asset (usado em "novo" e "editar"). */
export function AssetFields({ defaults = {} }: { defaults?: AssetDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${ui.label} sm:col-span-2`}>
        Nome
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={defaults.name}
          placeholder="Ex.: Apartamento Moema, Toyota Corolla 2021"
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Tipo
        <select name="kind" defaultValue={defaults.kind ?? "real_estate"} className={ui.input}>
          {ASSET_KINDS.map((k) => (
            <option key={k} value={k}>
              {ASSET_KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label className={ui.label}>
        País
        <select name="country" defaultValue={defaults.country ?? "BR"} className={ui.input}>
          <option value="BR">Brasil</option>
          <option value="US">EUA</option>
        </select>
      </label>
      <label className={ui.label}>
        Valor estimado (opcional)
        <input
          name="estimated_value"
          inputMode="decimal"
          defaultValue={defaults.estimated_value}
          placeholder="Ex.: 850.000,00"
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Moeda do valor
        <select name="currency" defaultValue={defaults.currency ?? "BRL"} className={ui.input}>
          <option value="BRL">BRL (R$)</option>
          <option value="USD">USD (US$)</option>
        </select>
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        Observações (opcional)
        <textarea
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={defaults.notes ?? ""}
          className={ui.input}
        />
      </label>
    </div>
  );
}
