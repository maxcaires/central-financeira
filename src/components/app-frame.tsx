import { NavLinks } from "@/components/nav-links";
import { logout } from "../app/(auth)/login/actions";

/** Estrutura das telas logadas: menu lateral no computador, barra inferior no celular. */
export function AppFrame({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-side p-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-rec text-sm font-bold text-side"
          >
            C
          </span>
          <span className="text-[15px] font-semibold text-white">Central Financeira</span>
        </div>
        <nav aria-label="Principal" className="mt-6 flex flex-col gap-1">
          <NavLinks variant="side" />
        </nav>
        <form action={logout} className="mt-auto border-t border-white/10 pt-4">
          <p className="truncate px-2 text-xs text-side-ink">{email}</p>
          <button
            type="submit"
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-side-ink hover:bg-white/5 hover:text-white"
          >
            Sair
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <span className="font-semibold">Central Financeira</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-muted">
              Sair
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>
        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface lg:hidden"
        >
          <NavLinks variant="bottom" />
        </nav>
      </div>
    </div>
  );
}
