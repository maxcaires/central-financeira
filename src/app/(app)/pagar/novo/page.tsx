import Link from "next/link";
import { EntryFields } from "@/components/entry-fields";
import { Flash } from "@/components/flash";
import { requireUser } from "@/lib/auth";
import { todayInZone } from "@/lib/dates";
import { ui } from "@/lib/ui";
import { createPayable } from "../actions";

export default async function NovaContaPagarPage(props: PageProps<"/pagar/novo">) {
  const { supabase } = await requireUser();
  const { ok, erro } = await props.searchParams;

  const { data: entities } = await supabase
    .from("entities")
    .select("id, name, country")
    .eq("active", true)
    .order("country")
    .order("name");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/pagar" className={`${ui.muted} hover:underline`}>
          ← Contas a pagar
        </Link>
        <h1 className={`${ui.h1} mt-1`}>Nova conta a pagar</h1>
      </div>

      <Flash ok={ok} erro={erro} />

      {(entities ?? []).length === 0 ? (
        <p className={ui.card}>
          Cadastre primeiro uma empresa ou categoria pessoal em{" "}
          <Link href="/configuracoes" className="underline">
            Configurações
          </Link>
          .
        </p>
      ) : (
        <form action={createPayable} className={`${ui.card} flex flex-col gap-5`}>
          <EntryFields
            entities={entities ?? []}
            counterpartyLabel="Beneficiário (quem recebe)"
            mode="create"
            showRecurrence
            defaults={{ due_date: todayInZone() }}
          />
          <div className="flex gap-3">
            <button type="submit" className={ui.btn}>
              Salvar
            </button>
            <Link href="/pagar" className={ui.btnSecondary}>
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
