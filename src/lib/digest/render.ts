// Renderização do resumo diário em HTML (estilos inline, compatível com clientes de e-mail) e texto.
// Todo texto vindo do usuário passa por escapeHtml. Não envia nada.

import { formatDateBR } from "../dates.ts";
import { COUNTRY_LABEL } from "../labels.ts";
import { formatMoney, type Currency } from "../money.ts";
import type { Digest, DigestGroup, DigestItem, DigestSection } from "./build.ts";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CURRENCIES: Currency[] = ["BRL", "USD"];

function totalsLine(t: Record<Currency, number>): string {
  const parts = CURRENCIES.filter((c) => t[c] > 0).map((c) => formatMoney(t[c], c));
  return parts.length ? parts.join(" + ") : "—";
}

function itemLabel(i: DigestItem): string {
  return i.installment ? `${i.description} (parcela ${i.installment})` : i.description;
}

function collectionLabel(i: DigestItem): string | null {
  if (!i.collection) return null;
  const when = formatDateBR(i.collection.at);
  return `Cobrar: ${when}${i.collection.note ? ` — ${i.collection.note}` : ""}`;
}

const S = {
  body: "margin:0;padding:16px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;",
  wrap: "max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:20px;",
  h1: "margin:0 0 4px;font-size:20px;",
  muted: "color:#71717a;font-size:13px;margin:0 0 8px;",
  h2: "margin:24px 0 4px;font-size:16px;border-bottom:2px solid #18181b;padding-bottom:4px;",
  h3: "margin:14px 0 4px;font-size:14px;",
  table: "width:100%;border-collapse:collapse;font-size:14px;",
  td: "padding:4px 0;border-bottom:1px solid #f4f4f5;vertical-align:top;",
  tdR: "padding:4px 0 4px 12px;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;",
  note: "font-size:12px;color:#92400e;",
  warn: "margin:12px 0;padding:8px;background:#fef3c7;border-radius:4px;font-size:13px;",
};

function htmlRows(items: DigestItem[], currency: Currency): string {
  return items
    .map((i) => {
      const col = collectionLabel(i);
      return `<tr><td style="${S.td}">${escapeHtml(itemLabel(i))}<br><span style="${S.muted.replace("margin:0 0 8px;", "margin:0;")}">${escapeHtml(i.party)} · vence ${formatDateBR(i.due_date)}</span>${
        col ? `<br><span style="${S.note}">${escapeHtml(col)}</span>` : ""
      }</td><td style="${S.tdR}">${formatMoney(i.balance, currency)}</td></tr>`;
    })
    .join("");
}

function htmlGroup(g: DigestGroup): string {
  const country = COUNTRY_LABEL[g.country] ?? g.country;
  let out = `<h3 style="${S.h3}">${escapeHtml(g.entityName)} · ${escapeHtml(country)} · ${g.currency}</h3>`;
  if (g.payables.length) {
    out += `<p style="${S.muted}">A pagar — subtotal ${formatMoney(g.payTotal, g.currency)}</p><table style="${S.table}">${htmlRows(g.payables, g.currency)}</table>`;
  }
  if (g.receivables.length) {
    out += `<p style="${S.muted}">A receber — subtotal ${formatMoney(g.recTotal, g.currency)}</p><table style="${S.table}">${htmlRows(g.receivables, g.currency)}</table>`;
  }
  return out;
}

function htmlSection(s: DigestSection): string {
  const n = s.payCount + s.recCount;
  let out = `<h2 style="${S.h2}">${escapeHtml(s.title)} (${n})</h2>`;
  if (n === 0) return out + `<p style="${S.muted}">Nada nesta seção.</p>`;
  out += `<p style="${S.muted}">A pagar: ${escapeHtml(totalsLine(s.payTotals))} · A receber: ${escapeHtml(totalsLine(s.recTotals))}</p>`;
  return out + s.groups.map(htmlGroup).join("");
}

export function renderHtml(d: Digest): string {
  const body = d.isEmpty
    ? `<p style="font-size:16px;margin:20px 0;">Nada pendente: nenhum vencimento atrasado, para hoje ou até ${formatDateBR(d.until)}.</p>`
    : d.sections.map(htmlSection).join("");
  const warn = d.truncated
    ? `<p style="${S.warn}">Atenção: há mais lançamentos em aberto do que o limite exibido; esta lista pode estar incompleta. Confira no painel.</p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(d.subject)}</title></head><body style="${S.body}"><div style="${S.wrap}"><h1 style="${S.h1}">Central Financeira</h1><p style="${S.muted}">Resumo de ${formatDateBR(d.date)} · cobre até ${formatDateBR(d.until)} · valores em BRL e USD, sem conversão</p>${warn}${body}</div></body></html>`;
}

export function renderText(d: Digest): string {
  const lines: string[] = [d.subject, `Resumo de ${formatDateBR(d.date)} (cobre até ${formatDateBR(d.until)}). BRL e USD sem conversão.`, ""];
  if (d.truncated) lines.push("ATENÇÃO: lista possivelmente incompleta (limite de itens). Confira no painel.", "");
  if (d.isEmpty) {
    lines.push("Nada pendente.");
    return lines.join("\n") + "\n";
  }
  for (const s of d.sections) {
    const n = s.payCount + s.recCount;
    lines.push(`== ${s.title} (${n}) ==`);
    if (n === 0) {
      lines.push("Nada nesta seção.", "");
      continue;
    }
    lines.push(`A pagar: ${totalsLine(s.payTotals)} | A receber: ${totalsLine(s.recTotals)}`);
    for (const g of s.groups) {
      lines.push("", `${g.entityName} · ${COUNTRY_LABEL[g.country] ?? g.country} · ${g.currency}`);
      const dump = (title: string, sub: number, items: DigestItem[]) => {
        if (!items.length) return;
        lines.push(`  ${title} (subtotal ${formatMoney(sub, g.currency)})`);
        for (const i of items) {
          lines.push(`   - ${itemLabel(i)} | ${i.party} | vence ${formatDateBR(i.due_date)} | ${formatMoney(i.balance, g.currency)}`);
          const col = collectionLabel(i);
          if (col) lines.push(`     ${col}`);
        }
      };
      dump("A pagar", g.payTotal, g.payables);
      dump("A receber", g.recTotal, g.receivables);
    }
    lines.push("");
  }
  return lines.join("\n");
}
