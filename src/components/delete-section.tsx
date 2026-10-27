import { ui } from "@/lib/ui";

/**
 * Exclusão definitiva com confirmação em duas etapas, sem JavaScript:
 * o bloco só abre ao clicar e o envio exige a caixa marcada (conferida de novo no servidor).
 */
export function DeleteSection({
  action,
  id,
  noun,
  consequences,
  hint,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  noun: string;
  consequences: string;
  /** Texto final do aviso; use "" para não mostrar a dica de Cancelar (que só existe nas contas). */
  hint?: string;
}) {
  return (
    <section className={ui.card}>
      <h2 className="font-medium">Excluir</h2>
      <details className="mt-3">
        <summary className={`${ui.btnDanger} cursor-pointer list-none`}>
          Excluir {noun} definitivamente…
        </summary>
        <form action={action} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <p className={ui.error}>
            Esta ação não pode ser desfeita. {consequences}
            {hint ?? " Para apenas tirar dos vencimentos mantendo o histórico, use Cancelar."}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" value="sim" required />
            Entendo que a exclusão é definitiva.
          </label>
          <div>
            <button type="submit" className={ui.btnDanger}>
              Confirmar exclusão
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
