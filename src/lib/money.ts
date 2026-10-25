// BRL e USD nunca são convertidos nem somados entre si.
// Todo total é calculado por moeda.

export const CURRENCIES = ["BRL", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  BRL: "pt-BR",
  USD: "en-US",
};

/** Formata um valor na sua própria moeda (ex.: R$ 1.234,56 ou $1,234.56). */
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
  }).format(amount);
}

/** Converte para centavos inteiros, evitando erros de ponto flutuante em somas. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Soma valores agrupando por moeda. Nunca mistura moedas. */
export function sumByCurrency(
  items: ReadonlyArray<{ amount: number; currency: Currency }>,
): Record<Currency, number> {
  const cents: Record<Currency, number> = { BRL: 0, USD: 0 };
  for (const item of items) {
    cents[item.currency] += toCents(item.amount);
  }
  return { BRL: fromCents(cents.BRL), USD: fromCents(cents.USD) };
}
