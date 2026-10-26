import { formatDateBR } from "@/lib/dates";
import { CHANNEL_LABEL } from "@/lib/labels";
import { ui } from "@/lib/ui";

export interface CollectionEntry {
  id: string;
  contacted_on: string;
  channel: string | null;
  note: string | null;
  next_action_at: string | null;
}

/** Histórico de contatos de cobrança + formulário para registrar um novo contato. */
export function CollectionSection({
  id,
  entries,
  today,
  nextActionAt,
  nextActionNote,
  addAction,
  deleteAction,
}: {
  id: string;
  entries: CollectionEntry[];
  today: string;
  nextActionAt: string | null;
  nextActionNote: string | null;
  addAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const pending = nextActionAt !== null;
  const late = pending && nextActionAt <= today;

  return (
    <section className={ui.card}>
      <h2 className="font-medium">Histórico de cobrança</h2>

      <p className={`${ui.muted} mt-1`}>
        {pending ? (
          <>
            Próxima ação:{" "}
            <span className={late ? "font-medium text-amber-700 dark:text-amber-400" : "font-medium"}>
              {formatDateBR(nextActionAt)}
              {late ? " (hoje ou atrasada)" : ""}
            </span>
            {nextActionNote ? ` — ${nextActionNote}` : ""}
          </>
        ) : (
          "Nenhuma próxima ação agendada."
        )}
      </p>

      {entries.length === 0 ? (
        <p className={`${ui.muted} mt-3`}>Nenhum contato registrado ainda.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-2">
              <div className="min-w-0 text-sm">
                <div className="font-medium">
                  {formatDateBR(e.contacted_on)}
                  {e.channel ? ` · ${CHANNEL_LABEL[e.channel] ?? e.channel}` : ""}
                </div>
                {e.note && <div className="whitespace-pre-wrap">{e.note}</div>}
                {e.next_action_at && (
                  <div className={ui.muted}>Agendou nova ação para {formatDateBR(e.next_action_at)}</div>
                )}
              </div>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="entry_id" value={e.id} />
                <button type="submit" className={ui.btnDanger}>
                  Remover
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={addAction}
        className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-4 dark:border-zinc-800"
      >
        <input type="hidden" name="id" value={id} />
        <label className={ui.label}>
          Data do contato
          <input name="contacted_on" type="date" defaultValue={today} max={today} className={ui.input} />
        </label>
        <label className={ui.label}>
          Canal
          <select name="channel" defaultValue="" className={ui.input}>
            <option value="">—</option>
            {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${ui.label} sm:col-span-2`}>
          O que foi combinado
          <input name="note" maxLength={1000} className={ui.input} />
        </label>
        <label className={ui.label}>
          Próxima ação em
          <input name="next_action_at" type="date" className={ui.input} />
        </label>
        <label className={`${ui.label} sm:col-span-3`}>
          O que fazer nessa data
          <input name="next_action_note" maxLength={300} className={ui.input} />
        </label>
        <div className="sm:col-span-4">
          <button type="submit" className={ui.btn}>
            Registrar contato
          </button>
          <span className={`${ui.muted} ml-3`}>
            Deixar a próxima ação em branco encerra a pendência atual.
          </span>
        </div>
      </form>
    </section>
  );
}
