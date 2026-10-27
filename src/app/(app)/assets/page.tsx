import Link from "next/link";
import { Flash } from "@/components/flash";
import { requireUser } from "@/lib/auth";
import { ASSET_KIND_LABEL, groupAssets, type AssetRow } from "@/lib/assets";
import { COUNTRY_LABEL } from "@/lib/labels";
import { formatMoney, type Currency } from "@/lib/money";
import { ui } from "@/lib/ui";

const LIMIT = 500;

export default async function AssetsPage(props: PageProps<"/assets">) {
  const { supabase } = await requireUser();
  const { ok, erro } = await props.searchParams;

  const { data, error } = await supabase
    .from("assets")
    .select("id, name, kind, country, currency, estimated_value, notes")
    .order("name")
    .limit(LIMIT);

  const rows: AssetRow[] = (data ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    kind: a.kind as string,
    country: a.country as string,
    currency: a.currency as Currency,
    estimated_value: a.estimated_value === null ? null : Number(a.estimated_value),
    notes: (a.notes as string | null) ?? null,
  }));
  const groups = groupAssets(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={ui.h1}>Assets</h1>
          <p className={ui.muted}>Imóveis, carros e outros bens, só para acompanhamento.</p>
        </div>
        <Link href="/assets/novo" className={ui.btn}>
          Novo asset
        </Link>
      </div>

      <Flash ok={ok} erro={erro} />
      {error && <p className={ui.error}>Não foi possível carregar os assets.</p>}

      {!error && groups.length === 0 && (
        <p className={ui.card}>
          Nenhum asset ainda. Use <strong>Novo asset</strong> para cadastrar o primeiro.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.country} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
            <h2 className="text-base font-semibold">
              {COUNTRY_LABEL[g.country] ?? g.country}{" "}
              <span className="text-sm font-normal text-muted">({g.rows.length})</span>
            </h2>
            <p className="text-sm tabular-nums">
              <span className="text-muted">Valor estimado: </span>
              <span className="font-semibold">
                {[g.totals.BRL > 0 && formatMoney(g.totals.BRL, "BRL"), g.totals.USD > 0 && formatMoney(g.totals.USD, "USD")]
                  .filter(Boolean)
                  .join(" + ") || "—"}
              </span>
              {g.withoutValue > 0 && <span className="text-muted"> · {g.withoutValue} sem valor</span>}
            </p>
          </header>
          <ul className="divide-y divide-line">
            {g.rows.map((a) => (
              <li key={a.id}>
                <Link href={`/assets/${a.id}`} className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-sunken">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted">
                      {ASSET_KIND_LABEL[a.kind as keyof typeof ASSET_KIND_LABEL] ?? a.kind}
                      {a.notes ? ` · ${a.notes.split("\n")[0]}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {a.estimated_value === null ? <span className="font-normal text-muted">sem valor</span> : formatMoney(a.estimated_value, a.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted">Valores são estimativas suas. Reais e dólares nunca são somados.</p>
    </div>
  );
}
