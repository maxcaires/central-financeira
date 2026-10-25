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

/**
 * Lê um valor digitado pelo usuário e devolve centavos inteiros (ou null se inválido).
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", "$1,234.56".
 * BRL: ponto = milhar e vírgula = decimal. USD: o inverso.
 * Com os dois separadores presentes, vale o que aparece por último como decimal.
 */
export function parseMoneyToCents(input: string, currency: Currency): number | null {
  const cleaned = input.replace(/[^\d.,]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const thousands = currency === "BRL" ? "." : ",";
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  let decimalSep: "." | "," | null = null;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const count = cleaned.split(sep).length - 1;
    const digitsAfter = cleaned.length - cleaned.lastIndexOf(sep) - 1;
    if (count === 1 && !(digitsAfter === 3 && sep === thousands)) {
      decimalSep = sep;
    }
  }

  let intPart = cleaned;
  let fracPart = "";
  if (decimalSep) {
    const idx = cleaned.lastIndexOf(decimalSep);
    intPart = cleaned.slice(0, idx);
    fracPart = cleaned.slice(idx + 1);
  }
  // Separadores na parte inteira só podem ser de milhar: mesmo caractere, grupos de 3 dígitos.
  if (/[.,]/.test(intPart) && !/^\d{1,3}([.,])\d{3}(\1\d{3})*$/.test(intPart)) return null;
  intPart = intPart.replace(/[.,]/g, "");
  if (/[.,]/.test(fracPart) || fracPart.length > 2) return null;
  if (intPart === "" && fracPart === "") return null;

  const cents = Number(intPart || "0") * 100 + Number((fracPart + "00").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

/**
 * Divide um total (em centavos) em n parcelas sem perder centavos:
 * as primeiras parcelas recebem 1 centavo a mais quando a divisão não é exata.
 */
export function splitInstallments(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
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

/** Valor para preencher um campo de texto (sem milhar): "1234,56" em BRL, "1234.56" em USD. */
export function formatInputAmount(amount: number, currency: Currency): string {
  const fixed = amount.toFixed(2);
  return currency === "BRL" ? fixed.replace(".", ",") : fixed;
}
