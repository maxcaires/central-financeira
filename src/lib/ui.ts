// Classes Tailwind compartilhadas, para manter as telas consistentes.

export const ui = {
  label: "block text-sm font-medium text-zinc-700 dark:text-zinc-300",
  input:
    "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm " +
    "focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 " +
    "dark:border-zinc-700 dark:bg-zinc-900",
  btn:
    "inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium " +
    "text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
  btnSecondary:
    "inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm " +
    "font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
  btnDanger:
    "inline-flex items-center justify-center rounded-md border border-red-300 px-4 py-2 text-sm " +
    "font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950",
  card: "rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950",
  th: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500",
  td: "px-3 py-2 text-sm",
  h1: "text-2xl font-semibold tracking-tight",
  muted: "text-sm text-zinc-500 dark:text-zinc-400",
  error:
    "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 " +
    "dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  notice:
    "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 " +
    "dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
} as const;
