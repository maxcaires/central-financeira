import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetFields } from "@/components/asset-fields";
import { DeleteSection } from "@/components/delete-section";
import { Flash } from "@/components/flash";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/entries";
import { formatInputAmount, type Currency } from "@/lib/money";
import { ui } from "@/lib/ui";
import { deleteAsset, updateAsset } from "../actions";

export default async function AssetPage(props: PageProps<"/assets/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const { supabase } = await requireUser();
  const { ok, erro } = await props.searchParams;

  const { data: a } = await supabase
    .from("assets")
    .select("id, name, kind, country, currency, estimated_value, notes")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/assets" className={`${ui.muted} hover:underline`}>
          ← Assets
        </Link>
        <h1 className={`${ui.h1} mt-1`}>{a.name}</h1>
      </div>
      <Flash ok={ok} erro={erro} />

      <form action={updateAsset} className={`${ui.card} flex flex-col gap-5`}>
        <input type="hidden" name="id" value={id} />
        <AssetFields
          defaults={{
            name: a.name,
            kind: a.kind,
            country: a.country,
            currency: a.currency,
            estimated_value:
              a.estimated_value === null ? "" : formatInputAmount(Number(a.estimated_value), a.currency as Currency),
            notes: a.notes,
          }}
        />
        <div>
          <button type="submit" className={ui.btn}>
            Salvar alterações
          </button>
        </div>
      </form>

      <DeleteSection
        action={deleteAsset}
        id={id}
        noun="este asset"
        consequences="O asset sai da sua lista."
        hint=""
      />
    </div>
  );
}
