import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SetupNotice } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ui } from "@/lib/ui";
import { logout } from "../(auth)/login/actions";

const NAV = [
  { href: "/", label: "Painel" },
  { href: "/pagar", label: "A pagar" },
  { href: "/receber", label: "A receber" },
  { href: "/configuracoes", label: "Configurações" },
];

// Com Cache Components, a leitura da sessão (cookies) acontece a cada requisição e precisa
// ficar atrás de um <Suspense>. Todo o app é autenticado, então a barreira fica aqui no layout.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Carregando…</p>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  // Garante que a checagem de configuração e de sessão rode por requisição, nunca no build.
  await connection();
  if (!getSupabaseEnv()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">Central Financeira</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="ml-auto flex items-center gap-3">
            <span className={`${ui.muted} hidden sm:inline`}>{user.email}</span>
            <button type="submit" className={ui.btnSecondary}>
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
