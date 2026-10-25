import { SetupNotice } from "@/components/setup-notice";
import { isLoginErrorKind, LOGIN_ERROR_MESSAGE } from "@/lib/auth-errors";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ui } from "@/lib/ui";
import { login } from "./actions";

export default async function LoginPage(props: PageProps<"/login">) {
  // Ler searchParams primeiro garante que a checagem abaixo rode por requisição, não no build.
  const { erro } = await props.searchParams;
  if (!getSupabaseEnv()) return <SetupNotice />;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div>
        <h1 className={ui.h1}>Central Financeira</h1>
        <p className={`${ui.muted} mt-1`}>Entre para continuar.</p>
      </div>

      {typeof erro === "string" && (
        <p className={ui.error}>
          {isLoginErrorKind(erro) ? LOGIN_ERROR_MESSAGE[erro] : LOGIN_ERROR_MESSAGE.outro}
        </p>
      )}

      <form action={login} className="flex flex-col gap-4">
        <label className={ui.label}>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={ui.input}
          />
        </label>
        <label className={ui.label}>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={ui.input}
          />
        </label>
        <button type="submit" className={ui.btn}>
          Entrar
        </button>
      </form>
    </main>
  );
}
