const TONES = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Selo do status do lançamento; mostra "Vencido" quando está em aberto e passou do vencimento. */
export function StatusBadge({
  label,
  status,
  isOpen,
  overdue,
}: {
  label: string;
  status: string;
  isOpen: boolean;
  overdue: boolean;
}) {
  if (isOpen && overdue) return <Badge tone="danger">Vencido · {label}</Badge>;
  if (status === "cancelled") return <Badge>{label}</Badge>;
  if (!isOpen) return <Badge tone="good">{label}</Badge>;
  if (status.startsWith("partially")) return <Badge tone="warn">{label}</Badge>;
  return <Badge>{label}</Badge>;
}
