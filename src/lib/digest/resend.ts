// Envio via API REST do Resend (sem pacote extra). A chave vem só de variável de ambiente do servidor.

export interface MailInput {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

export type MailResult = { ok: true; id: string | null } | { ok: false; error: string };

export async function sendMail(m: MailInput): Promise<MailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${m.apiKey}`,
        "Content-Type": "application/json",
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: m.from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${body.message ?? "erro"}`.slice(0, 300) };
    return { ok: true, id: body.id ?? null };
  } catch (e) {
    return { ok: false, error: `Falha de rede ao enviar: ${e instanceof Error ? e.name : "erro"}` };
  }
}
