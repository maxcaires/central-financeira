// Regras do cadastro de assets (imóveis, carros e outros). Sem Next/Supabase, para testar isolado.

import { CURRENCIES, parseMoneyToCents, sumByCurrency, type Currency } from "./money.ts";

export const ASSET_KINDS = ["real_estate", "vehicle", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  real_estate: "Imóvel",
  vehicle: "Carro / veículo",
  other: "Outro",
};

export const ASSET_COUNTRIES = ["BR", "US"] as const;
export type AssetCountry = (typeof ASSET_COUNTRIES)[number];

export interface AssetInput {
  name: string;
  kind: AssetKind;
  country: AssetCountry;
  currency: Currency;
  estimated_value: number | null; // em unidades da moeda; null = sem valor informado
  notes: string | null;
}

export type AssetParse = { ok: true; value: AssetInput } | { ok: false; error: string };

const MAX_CENTS = 99_999_999_999_999; // numeric(14,2)

function text(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

export function parseAssetForm(fd: FormData): AssetParse {
  const name = text(fd, "name");
  if (!name) return { ok: false, error: "Informe o nome do asset." };
  if (name.length > 120) return { ok: false, error: "O nome deve ter no máximo 120 caracteres." };

  const kind = text(fd, "kind");
  if (!(ASSET_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Tipo inválido." };

  const country = text(fd, "country");
  if (!(ASSET_COUNTRIES as readonly string[]).includes(country)) return { ok: false, error: "País inválido." };

  const currency = text(fd, "currency");
  if (!(CURRENCIES as readonly string[]).includes(currency)) return { ok: false, error: "Moeda inválida." };

  const notes = text(fd, "notes");
  if (notes.length > 2000) return { ok: false, error: "A observação deve ter no máximo 2000 caracteres." };

  let value: number | null = null;
  const rawValue = text(fd, "estimated_value");
  if (rawValue) {
    // parseMoneyToCents ignora o sinal; por isso o negativo é recusado aqui.
    const cents = rawValue.includes("-") ? null : parseMoneyToCents(rawValue, currency as Currency);
    if (cents === null || cents < 0 || cents > MAX_CENTS) return { ok: false, error: "Valor estimado inválido." };
    value = cents / 100;
  }

  return {
    ok: true,
    value: {
      name,
      kind: kind as AssetKind,
      country: country as AssetCountry,
      currency: currency as Currency,
      estimated_value: value,
      notes: notes || null,
    },
  };
}

export interface AssetRow {
  id: string;
  name: string;
  kind: string;
  country: string;
  currency: Currency;
  estimated_value: number | null;
  notes: string | null;
}

export interface AssetGroup {
  country: string;
  rows: AssetRow[];
  totals: Record<Currency, number>;
  withoutValue: number;
}

/** Agrupa por país (Brasil primeiro), ordenando por tipo e nome; totais por moeda, nunca somados entre si. */
export function groupAssets(rows: readonly AssetRow[]): AssetGroup[] {
  const kindOrder = (k: string) => {
    const i = (ASSET_KINDS as readonly string[]).indexOf(k);
    return i < 0 ? ASSET_KINDS.length : i;
  };
  return [...ASSET_COUNTRIES]
    .map((country) => {
      const list = rows
        .filter((r) => r.country === country)
        .sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name, "pt-BR"));
      return {
        country,
        rows: list,
        totals: sumByCurrency(
          list
            .filter((r) => r.estimated_value !== null)
            .map((r) => ({ amount: r.estimated_value as number, currency: r.currency })),
        ),
        withoutValue: list.filter((r) => r.estimated_value === null).length,
      };
    })
    .filter((g) => g.rows.length > 0);
}
