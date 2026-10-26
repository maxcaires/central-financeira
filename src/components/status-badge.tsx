const TONES = {
  neutral: "bg-sunken text-muted",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  good: "bg-rec-soft text-rec",
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
