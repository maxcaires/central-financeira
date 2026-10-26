import { DashboardView } from "@/components/dashboard-view";
import { requireUser } from "@/lib/auth";
import {
  allowedEntityIds,
  dueForCollection,
  parseFilters,
} from "@/lib/dashboard";
import { loadCollections, loadDueItems } from "@/lib/dashboard-data";
import { todayInZone } from "@/lib/dates";

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
  const ids = allowedEntityIds(entities, filters);

  const [pay, rec, col] = await Promise.all([
    loadDueItems(supabase, "payable", filters, ids, today),
    loadDueItems(supabase, "receivable", filters, ids, today),
    loadCollections(supabase, filters, ids, today),
  ]);

  const collections = dueForCollection(col.items, today);

  return (
    <DashboardView
      today={today}
      entities={entities.map((e) => ({ id: e.id, name: e.name as string, country: e.country as string }))}
      filters={filters}
      pay={pay.items}
      rec={rec.items}
      collections={collections}
      failed={Boolean(entityError || pay.failed || rec.failed || col.failed)}
      truncated={pay.truncated || rec.truncated || col.truncated}
      entitiesFailed={Boolean(entityError)}
    />
  );
}
