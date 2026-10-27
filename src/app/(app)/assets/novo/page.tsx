import Link from "next/link";
import { AssetFields } from "@/components/asset-fields";
import { Flash } from "@/components/flash";
import { requireUser } from "@/lib/auth";
import { ui } from "@/lib/ui";
import { createAsset } from "../actions";

export default async function NovoAssetPage(props: PageProps<"/assets/novo">) {
  await requireUser();
  const { ok, erro } = await props.searchParams;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/assets" className={`${ui.muted} hover:underline`}>
          ← Assets
        </Link>
        <h1 className={`${ui.h1} mt-1`}>Novo asset</h1>
      </div>
      <Flash ok={ok} erro={erro} />
      <form action={createAsset} className={`${ui.card} flex flex-col gap-5`}>
        <AssetFields />
        <div>
          <button type="submit" className={ui.btn}>
            Adicionar asset
          </button>
        </div>
      </form>
    </div>
  );
}
