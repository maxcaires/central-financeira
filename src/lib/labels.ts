export const PAYABLE_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  partially_paid: "Parcialmente pago",
  paid: "Pago",
  cancelled: "Cancelado",
};

export const RECEIVABLE_STATUS_LABEL: Record<string, string> = {
  open: "A receber",
  partially_received: "Parcialmente recebido",
  received: "Recebido",
  cancelled: "Cancelado",
};

export const RECURRENCE_LABEL: Record<string, string> = {
  none: "Não se repete",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export const COUNTRY_LABEL: Record<string, string> = { BR: "Brasil", US: "EUA" };

export const CHANNEL_LABEL: Record<string, string> = {
  phone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
  in_person: "Pessoalmente",
  other: "Outro",
};

/** Status em que o lançamento ainda está em aberto (entra em vencimentos e resumos). */
export const OPEN_PAYABLE_STATUSES = ["pending", "partially_paid"] as const;
export const OPEN_RECEIVABLE_STATUSES = ["open", "partially_received"] as const;
