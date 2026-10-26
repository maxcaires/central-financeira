// Montagem do resumo diário. Função pura: recebe os itens em aberto e devolve a estrutura do e-mail.
// Sem Next, sem Supabase, sem envio. Reaproveita a classificação do painel, então cada item
// aparece em exatamente uma seção (vencidos, hoje ou próximos 7 dias).

import { buildBuckets, type DashItem } from "../dashboard.ts";
import { addDays, formatDateBR } from "../dates.ts";
import { sumByCurrency, type Currency } from "../money.ts";

export type SectionKey = "overdue" | "today" | "next7";

export interface DigestItem {
  id: string;
  description: string;
  party: string;
  due_date: string;
  balance: number;
  installment: string | null; // "2/3"
  /** Só preenchido em valores a receber com ação de cobrança para hoje ou atrasada. */
  collection: { at: string; note: string | null } | null;
}

export interface DigestGroup {
  entityName: string;
  country: string;
  currency: Currency;
  payables: DigestItem[];
  receivables: DigestItem[];
  payTotal: number;
  recTotal: number;
}

export interface DigestSection {
  key: SectionKey;
  title: string;
  payCount: number;
  recCount: number;
  payTotals: Record<Currency, number>;
  recTotals: Record<Currency, number>;
  groups: DigestGroup[];
}

export interface Digest {
  date: string; // YYYY-MM-DD ("hoje" do resumo)
  until: string; // último dia coberto (hoje + 7)
  subject: string;
  isEmpty: boolean;
  truncated: boolean;
  sections: DigestSection[]; // sempre as 3, na ordem; as vazias têm groups = []
  counts: Record<SectionKey, number>;
}

export interface DigestInput {
  today: string;
  payables: readonly DashItem[];
  receivables: readonly DashItem[];
  /** id da entidade -> nome. Entidade desconhecida aparece como "Sem nome". */
  entityNames: Readonly<Record<string, string>>;
  truncated?: boolean;
}

const TITLES: Record<SectionKey, string> = {
  overdue: "Vencidos",
  today: "Vencem hoje",
  next7: "Próximos 7 dias",
};

const ORDER: SectionKey[] = ["overdue", "today", "next7"];

function toDigestItem(i: DashItem, today: string, isReceivable: boolean): DigestItem {
  const actionDue = isReceivable && i.next_action_at !== null && i.next_action_at <= today;
  return {
    id: i.id,
    description: i.description,
    party: i.party,
    due_date: i.due_date,
    balance: i.balance,
    installment: i.installment_no ? `${i.installment_no}/${i.installments_total}` : null,
    collection: actionDue ? { at: i.next_action_at as string, note: i.next_action_note } : null,
  };
}

function buildSection(
  key: SectionKey,
  pay: readonly DashItem[],
  rec: readonly DashItem[],
  input: DigestInput,
): DigestSection {
  const groups = new Map<string, DigestGroup>();

  const add = (i: DashItem, isReceivable: boolean) => {
    const entityName = input.entityNames[i.entity_id] ?? "Sem nome";
    const k = `${entityName}\u0000${i.country}\u0000${i.currency}`;
    let g = groups.get(k);
    if (!g) {
      g = {
        entityName,
        country: i.country,
        currency: i.currency,
        payables: [],
        receivables: [],
        payTotal: 0,
        recTotal: 0,
      };
      groups.set(k, g);
    }
    const item = toDigestItem(i, input.today, isReceivable);
    if (isReceivable) g.receivables.push(item);
    else g.payables.push(item);
  };

  for (const i of pay) add(i, false);
  for (const i of rec) add(i, true);

  const list = [...groups.values()];
  for (const g of list) {
    g.payTotal = sumByCurrency(g.payables.map((x) => ({ amount: x.balance, currency: g.currency })))[g.currency];
    g.recTotal = sumByCurrency(g.receivables.map((x) => ({ amount: x.balance, currency: g.currency })))[g.currency];
  }
  list.sort(
    (a, b) =>
      a.entityName.localeCompare(b.entityName, "pt-BR") ||
      a.country.localeCompare(b.country) ||
      a.currency.localeCompare(b.currency),
  );

  return {
    key,
    title: TITLES[key],
    payCount: pay.length,
    recCount: rec.length,
    payTotals: sumByCurrency(pay.map((i) => ({ amount: i.balance, currency: i.currency }))),
    recTotals: sumByCurrency(rec.map((i) => ({ amount: i.balance, currency: i.currency }))),
    groups: list,
  };
}

export function buildDigest(input: DigestInput): Digest {
  const pay = buildBuckets(input.payables, input.today);
  const rec = buildBuckets(input.receivables, input.today);

  const sections = ORDER.map((key) => buildSection(key, pay[key], rec[key], input));
  const counts = Object.fromEntries(
    sections.map((s) => [s.key, s.payCount + s.recCount]),
  ) as Record<SectionKey, number>;
  const total = counts.overdue + counts.today + counts.next7;

  const short = formatDateBR(input.today).slice(0, 5); // dd/mm
  const subject =
    total === 0
      ? `Central Financeira ${short}: nada pendente`
      : `Central Financeira ${short}: ${counts.overdue} vencidos · ${counts.today} hoje · ${counts.next7} nos próximos 7 dias`;

  return {
    date: input.today,
    until: addDays(input.today, 7),
    subject,
    isEmpty: total === 0,
    truncated: input.truncated ?? false,
    sections,
    counts,
  };
}
