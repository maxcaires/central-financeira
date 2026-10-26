// Classes Tailwind compartilhadas, para manter as telas consistentes.
// As cores vêm das variáveis de globals.css (claro/escuro automáticos).

export const ui = {
  label: "block text-sm font-medium text-ink",
  input:
    "mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink " +
    "placeholder:text-muted focus:border-rec focus:outline-none focus:ring-2 focus:ring-rec/25",
  btn:
    "inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium " +
    "text-brand-ink transition-opacity hover:opacity-90",
  btnSecondary:
    "inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 " +
    "text-sm font-medium text-ink hover:bg-sunken",
  btnDanger:
    "inline-flex items-center justify-center rounded-lg border border-danger/40 px-4 py-2 text-sm " +
    "font-medium text-danger hover:bg-danger-soft",
  card: "rounded-2xl border border-line bg-surface p-5",
  th: "px-3 py-2 text-left text-xs font-medium text-muted",
  td: "px-3 py-2 text-sm",
  h1: "text-2xl font-semibold tracking-tight",
  muted: "text-sm text-muted",
  error: "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger",
  notice: "rounded-lg border border-rec/40 bg-rec-soft px-3 py-2 text-sm text-rec",
} as const;
