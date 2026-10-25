import { ui } from "@/lib/ui";

/** Mostrado enquanto as variáveis do Supabase não estiverem configuradas. */
export function SetupNotice() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className={ui.h1}>Central Financeira</h1>
      <div className={ui.card}>
        <h2 className="font-medium">Configuração pendente</h2>
        <p className={`${ui.muted} mt-2`}>
          O Supabase ainda não foi configurado. Crie o arquivo{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.local</code> na raiz do
          projeto com{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          e{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          , conforme o passo a passo do README, e reinicie o servidor.
        </p>
      </div>
    </main>
  );
}
