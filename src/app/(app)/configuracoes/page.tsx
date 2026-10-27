import Link from "next/link";
import { Flash } from "@/components/flash";
import { requireUser } from "@/lib/auth";
import { ui } from "@/lib/ui";
import { createEntity, renameEntity, saveDigestSettings, sendTestDigest, setEntityActive } from "./actions";

const KIND_LABEL = { company: "Empresa", personal: "Pessoal" } as const;
const COUNTRY_LABEL = { BR: "Brasil", US: "EUA" } as const;

export default async function ConfiguracoesPage(props: PageProps<"/configuracoes">) {
  const { supabase } = await requireUser();
  const { ok, erro } = await props.searchParams;

  const { data: entities, error } = await supabase
    .from("entities")
    .select("id, name, kind, country, active")
    .order("active", { ascending: false })
    .order("country")
    .order("name");

  const { data: digest } = await supabase
    .from("notification_settings")
    .select("enabled, include_empty, recipient_email")
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <h1 className={ui.h1}>Configurações</h1>
      <Flash ok={ok} erro={erro} />
      {error && <p className={ui.error}>Não foi possível carregar as entidades.</p>}

      <section className={ui.card}>
        <h2 className="font-medium">Empresas e categorias pessoais</h2>
        <p className={`${ui.muted} mt-1`}>
          Cada lançamento pertence a uma delas. Você pode renomear a qualquer momento; entidades
          desativadas deixam de aparecer em novos lançamentos, mas o histórico é preservado.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className={ui.th}>Nome</th>
                <th className={ui.th}>Tipo</th>
                <th className={ui.th}>País</th>
                <th className={ui.th}>Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(entities ?? []).map((e) => (
                <tr key={e.id} className={e.active ? "" : "opacity-60"}>
                  <td className={ui.td}>
                    <form action={renameEntity} className="flex gap-2">
                      <input type="hidden" name="id" value={e.id} />
                      <input
                        name="name"
                        defaultValue={e.name}
                        maxLength={80}
                        required
                        aria-label={`Nome de ${e.name}`}
                        className={`${ui.input} mt-0 max-w-xs`}
                      />
                      <button type="submit" className={ui.btnSecondary}>
                        Renomear
                      </button>
                    </form>
                  </td>
                  <td className={ui.td}>{KIND_LABEL[e.kind as keyof typeof KIND_LABEL]}</td>
                  <td className={ui.td}>{COUNTRY_LABEL[e.country as keyof typeof COUNTRY_LABEL]}</td>
                  <td className={ui.td}>
                    <form action={setEntityActive}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="active" value={e.active ? "false" : "true"} />
                      <button type="submit" className={e.active ? ui.btnSecondary : ui.btn}>
                        {e.active ? "Desativar" : "Reativar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {(entities ?? []).length === 0 && (
                <tr>
                  <td className={`${ui.td} ${ui.muted}`} colSpan={4}>
                    Nenhuma entidade cadastrada ainda. Cadastre abaixo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="font-medium">Nova entidade</h2>
        <form action={createEntity} className="mt-3 grid gap-4 sm:grid-cols-4">
          <label className={`${ui.label} sm:col-span-2`}>
            Nome
            <input name="name" required maxLength={80} className={ui.input} />
          </label>
          <label className={ui.label}>
            Tipo
            <select name="kind" defaultValue="company" className={ui.input}>
              <option value="company">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </label>
          <label className={ui.label}>
            País
            <select name="country" defaultValue="BR" className={ui.input}>
              <option value="BR">Brasil</option>
              <option value="US">EUA</option>
            </select>
          </label>
          <div className="sm:col-span-4">
            <button type="submit" className={ui.btn}>
              Cadastrar
            </button>
          </div>
        </form>
      </section>

      <section className={ui.card}>
        <h2 className="font-medium">Resumo diário por e-mail</h2>
        <p className={`${ui.muted} mt-1`}>
          Um e-mail por dia, às 08:00 (Brasília), com vencidos, vencem hoje e próximos 7 dias. O envio só
          funciona depois de configurar o Resend e o agendamento (veja o README).
        </p>
        <form action={saveDigestSettings} className="mt-4 flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={digest?.enabled ?? false} className="h-4 w-4" />
            Enviar o resumo diário
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="include_empty"
              defaultChecked={digest?.include_empty ?? true}
              className="h-4 w-4"
            />
            Enviar mesmo quando não houver nada pendente
          </label>
          <label className={ui.label}>
            Enviar para (opcional)
            <input
              name="recipient_email"
              type="email"
              maxLength={200}
              defaultValue={digest?.recipient_email ?? ""}
              placeholder="Em branco usa o e-mail definido no servidor"
              className={`${ui.input} max-w-md`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={ui.btn}>
              Salvar
            </button>
            <Link href="/configuracoes/resumo" className={ui.btnSecondary}>
              Pré-visualizar o resumo de hoje
            </Link>
          </div>
        </form>
        <form action={sendTestDigest} className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <button type="submit" className={ui.btnSecondary}>
            Enviar e-mail de teste agora
          </button>
          <span className={ui.muted}>Marcado [TESTE]; não conta como o envio do dia.</span>
        </form>
      </section>
    </div>
  );
}
