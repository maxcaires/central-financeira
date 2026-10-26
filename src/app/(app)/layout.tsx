import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SetupNotice } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { AppFrame } from "@/components/app-frame";

// Com Cache Components, a leitura da sessão (cookies) acontece a cada requisição e precisa
// ficar atrás de um <Suspense>. Todo o app é autenticado, então a barreira fica aqui no layout.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando…</p>}>
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

  return <AppFrame email={user.email ?? ""}>{children}</AppFrame>;
}
