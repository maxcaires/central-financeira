import { ui } from "@/lib/ui";

/** Mensagem de sucesso/erro vinda da query string (?ok=... / ?erro=...), exibida como texto simples. */
export function Flash({ ok, erro }: { ok?: string | string[]; erro?: string | string[] }) {
  const okMsg = Array.isArray(ok) ? ok[0] : ok;
  const erroMsg = Array.isArray(erro) ? erro[0] : erro;
  if (!okMsg && !erroMsg) return null;
  return (
    <div className="flex flex-col gap-2">
      {erroMsg && <p className={ui.error}>{erroMsg}</p>}
      {okMsg && <p className={ui.notice}>{okMsg}</p>}
    </div>
  );
}
