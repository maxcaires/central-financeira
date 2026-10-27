import { NextResponse } from "next/server";
import { todayInZone } from "@/lib/dates";
import { EMPTY_FILTERS } from "@/lib/dashboard";
import { loadDueItems } from "@/lib/dashboard-data";
import { isAuthorized } from "@/lib/digest/auth";
import { buildDigest } from "@/lib/digest/build";
import { renderHtml, renderText } from "@/lib/digest/render";
import { sendMail } from "@/lib/digest/resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Chamada pelo agendador (pg_cron) às 08:00 de Brasília, com "Authorization: Bearer <CRON_SECRET>".
// POST /api/cron/daily-digest          envio do dia (no máximo um por dia, por causa de digest_runs)
// POST /api/cron/daily-digest?teste=1  envia agora, marcado [TESTE], sem registrar o dia

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "não autorizado" }, { status: 401 });
  }

  const isTest = new URL(request.url).searchParams.get("teste") === "1";
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.DIGEST_FROM_EMAIL?.trim();
  const admin = createAdminClient();
  if (!apiKey || !from || !admin) {
    return NextResponse.json({ ok: false, error: "configuração incompleta no servidor" }, { status: 500 });
  }

  const { data: settings, error: sErr } = await admin
    .from("notification_settings")
    .select("owner_id, recipient_email, include_empty")
    .eq("enabled", true);
  if (sErr) return NextResponse.json({ ok: false, error: "falha ao ler configurações" }, { status: 500 });
  if (!settings || settings.length === 0) {
    return NextResponse.json({ ok: true, skipped: "resumo desligado em Configurações" });
  }

  const today = todayInZone();
  const results: { sent: boolean; reason?: string }[] = [];

  for (const s of settings) {
    const ownerId = s.owner_id as string;
    const to = (s.recipient_email as string | null)?.trim() || process.env.DIGEST_TO_EMAIL?.trim();
    if (!to) {
      results.push({ sent: false, reason: "sem destinatário" });
      continue;
    }

    // Reserva o dia antes de enviar: um segundo disparo bate na chave única e não envia de novo.
    if (!isTest) {
      const { error } = await admin.from("digest_runs").insert({ owner_id: ownerId, run_date: today, status: "pending" });
      if (error) {
        if (error.code !== "23505") {
          results.push({ sent: false, reason: "falha ao reservar o dia" });
          continue;
        }
        // Já existe registro de hoje: só tenta de novo se a tentativa anterior falhou.
        const { data: prev } = await admin
          .from("digest_runs")
          .select("status")
          .eq("owner_id", ownerId)
          .eq("run_date", today)
          .maybeSingle();
        if (prev?.status !== "failed") {
          results.push({ sent: false, reason: "já enviado hoje" });
          continue;
        }
        await admin.from("digest_runs").update({ status: "pending", error: null }).eq("owner_id", ownerId).eq("run_date", today);
      }
    }

    const [{ data: entities }, pay, rec] = await Promise.all([
      admin.from("entities").select("id, name").eq("owner_id", ownerId),
      loadDueItems(admin, "payable", EMPTY_FILTERS, null, today, ownerId),
      loadDueItems(admin, "receivable", EMPTY_FILTERS, null, today, ownerId),
    ]);

    const fail = async (error: string) => {
      if (!isTest)
        await admin.from("digest_runs").update({ status: "failed", error }).eq("owner_id", ownerId).eq("run_date", today);
      results.push({ sent: false, reason: error });
    };

    // Dados incompletos: melhor não enviar um resumo que parece "tudo em dia" por engano.
    if (pay.failed || rec.failed) {
      await fail("falha ao carregar lançamentos");
      continue;
    }

    const digest = buildDigest({
      today,
      payables: pay.items,
      receivables: rec.items,
      entityNames: Object.fromEntries((entities ?? []).map((e) => [e.id as string, e.name as string])),
      truncated: pay.truncated || rec.truncated,
    });

    if (digest.isEmpty && s.include_empty === false && !isTest) {
      await admin.from("digest_runs").update({ status: "skipped", counts: digest.counts }).eq("owner_id", ownerId).eq("run_date", today);
      results.push({ sent: false, reason: "nada pendente (envio de vazio desligado)" });
      continue;
    }

    const mail = await sendMail({
      apiKey,
      from,
      to,
      subject: isTest ? `[TESTE] ${digest.subject}` : digest.subject,
      html: renderHtml(digest),
      text: renderText(digest),
      idempotencyKey: isTest ? undefined : `digest-${ownerId}-${today}`,
    });

    if (!mail.ok) {
      await fail(mail.error);
      continue;
    }
    if (!isTest) {
      await admin
        .from("digest_runs")
        .update({ status: "sent", sent_at: new Date().toISOString(), counts: digest.counts, error: null })
        .eq("owner_id", ownerId)
        .eq("run_date", today);
    }
    results.push({ sent: true });
  }

  const allOk = results.every((r) => r.sent || r.reason === "já enviado hoje" || r.reason?.startsWith("nada pendente"));
  return NextResponse.json({ ok: allOk, test: isTest, results }, { status: allOk ? 200 : 502 });
}
