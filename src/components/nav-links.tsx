"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  painel: <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />,
  pagar: <path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" />,
  receber: <path d="M12 20V8m0 0-4 4m4-4 4 4M5 4h14" />,
  config: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.7 1.7 1L11 21h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5Z" />
  ),
};

export const NAV = [
  { href: "/", label: "Painel", icon: "painel" },
  { href: "/pagar", label: "A pagar", icon: "pagar" },
  { href: "/receber", label: "A receber", icon: "receber" },
  { href: "/configuracoes", label: "Configurações", icon: "config" },
] as const;

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (variant === "bottom") {
    return (
      <>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n.href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive(n.href) ? "font-semibold text-ink" : "text-muted"
            }`}
          >
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive(n.href)
              ? "bg-white/10 font-medium text-white"
              : "text-side-ink hover:bg-white/5 hover:text-white"
          }`}
        >
          <Icon name={n.icon} />
          {n.label}
        </Link>
      ))}
    </>
  );
}
