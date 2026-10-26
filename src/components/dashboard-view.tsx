import { CollectionsPanel, DueList, TotalsText } from "@/components/dashboard-section";
import { DashboardFilters } from "@/components/dashboard-filters";
import { WeekStrip } from "@/components/week-strip";
import { buildBuckets, hasActiveFilters, type DashItem, type Filters } from "@/lib/dashboard";
import { buildWeek } from "@/lib/week";
import { ui } from "@/lib/ui";

export interface DashboardViewProps {
  today: string;
  entities: { id: string; name: string; country: string }[];
  filters: Filters;
  pay: DashItem[];
  rec: DashItem[];
  collections: DashItem[];
  failed: boolean;
  truncated: boolean;
  entitiesFailed: boolean;
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function DashboardView(p: DashboardViewProps) {
  const payB = buildBuckets(p.pay, p.today);
  const recB = buildBuckets(p.rec, p.today);
  const week = buildWeek(p.pay, p.rec, p.today);
  const entityName = new Map(p.entities.map((e) => [e.id, e.name]));
  const filtered = hasActiveFilters(p.filters);

  const count = (b: typeof payB) => b.overdue.length + b.today.length + b.next7.length;
  const nothingAtAll = count(payB) + count(recB) + p.collections.length === 0;

  const summary = [
    { label: "Vencidos", pay: payB.overdue, rec: recB.overdue, late: true },
    { label: "Vencem hoje", pay: payB.today, rec: recB.today, late: false },
    { label: "Próximos 7 dias", pay: payB.next7, rec: recB.next7, late: false },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className={ui.h1}>Painel</h1>
        <p className="text-sm text-muted first-letter:uppercase">{longDate(p.today)}</p>
      </header>

      <DashboardFilters entities={p.entities} filters={p.filters} />

      {p.failed && <p className={ui.error}>Não foi possível carregar parte dos dados. Recarregue a página.</p>}
      {p.truncated && (
        <p className={ui.muted}>
          Há muitos itens: o painel mostra os 500 mais antigos de cada lista. Use os filtros para refinar.
        </p>
      )}
      {p.entities.length === 0 && !p.entitiesFailed && (
        <p className={ui.card}>Comece cadastrando suas empresas e categorias pessoais em Configurações.</p>
      )}

      <section
        aria-label="Resumo"
        className="grid divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        {summary.map((s) => (
          <div
            key={s.label}
            className={`px-5 py-4 ${s.late && s.pay.length + s.rec.length > 0 ? "bg-danger-soft" : ""}`}
          >
            <p className={`text-sm font-medium ${s.late && s.pay.length + s.rec.length > 0 ? "text-danger" : "text-muted"}`}>
              {s.label}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted">A pagar · {s.pay.length}</dt>
                <dd className="text-base font-semibold tabular-nums text-pay sm:text-lg">
                  <TotalsText items={s.pay} stacked />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">A receber · {s.rec.length}</dt>
                <dd className="text-base font-semibold tabular-nums text-rec sm:text-lg">
                  <TotalsText items={s.rec} stacked />
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </section>
      <p className="-mt-3 text-xs text-muted">
        Reais e dólares nunca são somados.{filtered ? " Filtros ativos." : ""}
      </p>

      <WeekStrip columns={week} />

      {nothingAtAll && !p.failed && p.entities.length > 0 && (
        <p className={ui.notice}>
          {filtered
            ? "Nada encontrado com esses filtros."
            : "Tudo em dia: nenhum vencimento ou cobrança pendente até os próximos 7 dias."}
        </p>
      )}

      {p.collections.length > 0 && (
        <CollectionsPanel items={p.collections} today={p.today} entityName={entityName} />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <DueList
          title="A pagar"
          kind="pay"
          href="/pagar"
          today={p.today}
          entityName={entityName}
          groups={[
            { title: "Vencidas", tone: "danger", items: payB.overdue, emptyText: "Nenhuma conta vencida." },
            { title: "Vencem hoje", tone: "warn", items: payB.today, emptyText: "Nada a pagar hoje." },
            { title: "Próximos 7 dias", tone: "neutral", items: payB.next7, emptyText: "Nada a pagar nos próximos 7 dias." },
          ]}
        />
        <DueList
          title="A receber"
          kind="rec"
          href="/receber"
          today={p.today}
          entityName={entityName}
          showNextAction
          groups={[
            { title: "Vencidos", tone: "danger", items: recB.overdue, emptyText: "Nenhum recebimento vencido." },
            { title: "Vencem hoje", tone: "warn", items: recB.today, emptyText: "Nada a receber hoje." },
            { title: "Próximos 7 dias", tone: "neutral", items: recB.next7, emptyText: "Nada a receber nos próximos 7 dias." },
          ]}
        />
      </div>
    </div>
  );
}
