import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EMPTY_FILTERS } from "@/lib/dashboard";
import { loadDueItems } from "@/lib/dashboard-data";
import { isValidIsoDate, todayInZone } from "@/lib/dates";
import { buildDigest } from "@/lib/digest/build";
import { renderHtml, renderText } from "@/lib/digest/render";
import { ui } from "@/lib/ui";

export default async function ResumoPreviewPage(props: PageProps<"/configuracoes/resumo">) {
  const { supabase } = await requireUser();
  const sp = await props.searchParams;
  const real = todayInZone();
  const raw = typeof sp.data === "string" ? sp.data : "";
  const simulated = isValidIsoDate(raw);
  const today = simulated ? raw : real;

  const [{ data: entities }, pay, rec] = await Promise.all([
    supabase.from("entities").select("id, name"),
    loadDueItems(supabase, "payable", EMPTY_FILTERS, null, today),
    loadDueItems(supabase, "receivable", EMPTY_FILTERS, null, today),
  ]);

  const failed = pay.failed || rec.failed;
  const digest = buildDigest({
    today,
    payables: pay.items,
    receivables: rec.items,
    entityNames: Object.fromEntries((entities ?? []).map((e) => [e.id as string, e.name as string])),
    truncated: pay.truncated || rec.truncated,
  });

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/configuracoes" className={`${ui.muted} hover:underline`}>
          ← Configurações
        </Link>
        <h1 className={`${ui.h1} mt-1`}>Pré-visualização do resumo diário</h1>
        <p className={ui.muted}>
          É assim que o e-mail ficaria hoje. <strong>Nada foi enviado</strong>: o envio real só será
          ativado na Etapa 7, com a sua autorização.
        </p>
      </div>

      {failed && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
          Não foi possível carregar todos os lançamentos. A pré-visualização pode estar incompleta.
        </p>
      )}

      <form method="get" className={`${ui.card} flex flex-wrap items-end gap-3`}>
        <label className={ui.label}>
          Simular outra data
          <input name="data" type="date" defaultValue={simulated ? raw : ""} className={ui.input} />
        </label>
        <button type="submit" className={ui.btn}>
          Simular
        </button>
        {simulated && (
          <Link href="/configuracoes/resumo" className={`${ui.muted} underline`}>
            Voltar para hoje
          </Link>
        )}
      </form>

      <section className={ui.card}>
        <p className={ui.muted}>Assunto</p>
        <p className="font-medium">{digest.subject}</p>
        <p className={`${ui.muted} mt-1`}>
          {simulated ? "Data simulada" : "Hoje"}: {today}
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-medium">E-mail (HTML)</h2>
        <iframe
          title="Pré-visualização do e-mail"
          sandbox=""
          srcDoc={renderHtml(digest)}
          className="h-[640px] w-full rounded-xl border border-line bg-white"
        />
      </section>

      <section className={ui.card}>
        <h2 className="mb-2 font-medium">Versão em texto</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap text-sm">{renderText(digest)}</pre>
      </section>
    </div>
  );
}
