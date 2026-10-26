import { Suspense } from "react";

// A página de login lê searchParams e a configuração a cada requisição.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando…</p>}>
      {children}
    </Suspense>
  );
}
