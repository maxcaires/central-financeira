import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardSection, TotalsText } from "@/components/dashboard-section";
import { requireUser } from "@/lib/auth";
import {
  allowedEntityIds,
  buildBuckets,
  dueForCollection,
  hasActiveFilters,
  parseFilters,
} from "@/lib/dashboard";
import { loadCollections, loadDueItems } from "@/lib/dashboard-data";
import { formatDateBR, todayInZone } from "@/lib/dates";
import { ui } from "@/lib/ui";

export default async function PainelPage(props: PageProps<"/">) {
  const { supabase } = await requireUser();
  const filters = parseFilters(await props.searchParams);
  const today = todayInZone();

  const { data: entityRows, error: entityError } = await supabase
    .from("entities")
    .select("id, name, kind, country, active")
    .order("country")
    .order("name");
  const entities = entityRows ?? [];
  const entityName = new Map(entities.map((e) => [e.id, e.name as string]));
  const ids = allowedEntityIds(entities, filters);

  const [pay, rec, col] = await Promise.all([
    loadDueItems(supabase, "payable", filters, ids, today),
    loadDueItems(supabase, "receivable", filters, ids, today),
    loadCollections(supabase, filters, ids, today),
  ]);

  const payB = buildBuckets(pay.items, today);
  const recB = buildBuckets(rec.items, today);
  const collections = dueForCollection(col.items, today);

  const failed = entityError || pay.failed || rec.failed || col.failed;
  const truncated = pay.truncated || rec.truncated || col.truncated;
  const filtered = hasActiveFilters(filters);
  const nothingAtAll =
    payB.overdue.length + payB.today.length + payB.next7.length === 0 &&
    recB.overdue.length + recB.today.length + recB.next7.length === 0 &&
    collections.length === 0;

  const rows = [
    { label: "Vencidos", pay: payB.overdue, rec: recB.overdue },
    { label: "Vencem hoje", pay: payB.today, rec: recB.today },
    { label: "Próximos 7 dias", pay: payB.next7, rec: recB.next7 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className={ui.h1}>Painel</h1>
        <p className={ui.muted}>Hoje: {formatDateBR(today)} (horário de Brasília)</p>
      </div>

      <DashboardFilters
        entities={entities.map((e) => ({ id: e.id, name: e.name, country: e.country }))}
        filters={filters}
      />

      {failed && <p className={ui.error}>Não foi possível carregar parte dos dados. Tente recarregar.</p>}
      {truncated && (
        <p className={ui.muted}>
          Há muitos itens: o painel mostra os 500 mais antigos de cada lista. Use os filtros para
          refinar.
        </p>
      )}

      {entities.length === 0 && !entityError && (
        <p className={ui.card}>
          Comece cadastrando suas empresas e categorias pessoais em Configurações.
        </p>
      )}

      <section className={ui.card}>
        <h2 className="font-medium">Resumo</h2>
        <p className={`${ui.muted} mt-1`}>
          Saldos pendentes por moeda; reais e dólares nunca são somados.
          {filtered ? " Filtros ativos." : ""}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr>
                <th className={ui.th}></th>
                <th className={ui.th}>A pagar</th>
                <th className={ui.th}>A receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className={`${ui.td} font-medium`}>{r.label}</td>
                  <td className={`${ui.td} tabular-nums`}>
                    <span className={ui.muted}>{r.pay.length} · </span>
                    <TotalsText items={r.pay} />
                  </td>
                  <td className={`${ui.td} tabular-nums`}>
                    <span className={ui.muted}>{r.rec.length} · </span>
                    <TotalsText items={r.rec} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {nothingAtAll && !failed && entities.length > 0 && (
        <p className={ui.notice}>
          {filtered
            ? "Nada encontrado com esses filtros."
            : "Tudo em dia: nenhum vencimento ou cobrança pendente até os próximos 7 dias."}
        </p>
      )}

      {collections.length > 0 && (
        <DashboardSection
          title="Cobranças para hoje ou atrasadas"
          items={collections}
          href="/receber"
          tone="warn"
          entityName={entityName}
          showNextAction
          emptyText=""
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">A pagar</h2>
          <DashboardSection
            title="Vencidas"
            items={payB.overdue}
            href="/pagar"
            tone="danger"
            entityName={entityName}
            emptyText="Nenhuma conta vencida."
          />
          <DashboardSection
            title="Vencem hoje"
            items={payB.today}
            href="/pagar"
            tone="warn"
            entityName={entityName}
            emptyText="Nada a pagar hoje."
          />
          <DashboardSection
            title="Próximos 7 dias"
            items={payB.next7}
            href="/pagar"
            tone="neutral"
            entityName={entityName}
            emptyText="Nada a pagar nos próximos 7 dias."
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">A receber</h2>
          <DashboardSection
            title="Vencidos"
            items={recB.overdue}
            href="/receber"
            tone="danger"
            entityName={entityName}
            showNextAction
            emptyText="Nenhum recebimento vencido."
          />
          <DashboardSection
            title="Vencem hoje"
            items={recB.today}
            href="/receber"
            tone="warn"
            entityName={entityName}
            showNextAction
            emptyText="Nada a receber hoje."
          />
          <DashboardSection
            title="Próximos 7 dias"
            items={recB.next7}
            href="/receber"
            tone="neutral"
            entityName={entityName}
            showNextAction
            emptyText="Nada a receber nos próximos 7 dias."
          />
        </div>
      </div>
    </div>
  );
}
