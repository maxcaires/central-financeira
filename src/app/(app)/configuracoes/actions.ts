"use server";

import { revalidatePath } from "next/cache";
import { flash, requireUser } from "@/lib/auth";
import { EMPTY_FILTERS } from "@/lib/dashboard";
import { loadDueItems } from "@/lib/dashboard-data";
import { todayInZone } from "@/lib/dates";
import { buildDigest } from "@/lib/digest/build";
import { renderHtml, renderText } from "@/lib/digest/render";
import { sendMail } from "@/lib/digest/resend";

const PATH = "/configuracoes";

export async function createEntity(formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const country = String(formData.get("country") ?? "");

  if (!name) flash(PATH, "erro", "Informe o nome.");
  if (name.length > 80) flash(PATH, "erro", "O nome deve ter no máximo 80 caracteres.");
  if (kind !== "company" && kind !== "personal") flash(PATH, "erro", "Tipo inválido.");
  if (country !== "BR" && country !== "US") flash(PATH, "erro", "País inválido.");

  const { error } = await supabase.from("entities").insert({ name, kind, country });
  if (error) flash(PATH, "erro", "Não foi possível cadastrar a entidade.");

  revalidatePath(PATH);
  flash(PATH, "ok", `"${name}" cadastrada.`);
}

export async function renameEntity(formData: FormData) {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) flash(PATH, "erro", "Entidade inválida.");
  if (!name) flash(PATH, "erro", "Informe o nome.");
  if (name.length > 80) flash(PATH, "erro", "O nome deve ter no máximo 80 caracteres.");

  const { error } = await supabase.from("entities").update({ name }).eq("id", id);
  if (error) flash(PATH, "erro", "Não foi possível renomear.");

  revalidatePath(PATH);
  flash(PATH, "ok", "Nome atualizado.");
}

export async function setEntityActive(formData: FormData) {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) flash(PATH, "erro", "Entidade inválida.");

  const { error } = await supabase.from("entities").update({ active }).eq("id", id);
  if (error) flash(PATH, "erro", "Não foi possível alterar o status.");

  revalidatePath(PATH);
  flash(PATH, "ok", active ? "Entidade reativada." : "Entidade desativada.");
}

export async function saveDigestSettings(formData: FormData) {
  const { supabase, user } = await requireUser();

  const enabled = formData.get("enabled") === "on";
  const includeEmpty = formData.get("include_empty") === "on";
  const recipient = String(formData.get("recipient_email") ?? "").trim();

  if (recipient && (recipient.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)))
    flash(PATH, "erro", "E-mail do destinatário inválido.");

  const { error } = await supabase.from("notification_settings").upsert(
    {
      owner_id: user.id,
      enabled,
      include_empty: includeEmpty,
      recipient_email: recipient || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) flash(PATH, "erro", "Não foi possível salvar o resumo diário.");

  revalidatePath(PATH);
  flash(PATH, "ok", enabled ? "Resumo diário ligado." : "Resumo diário desligado.");
}

/** Envia agora um e-mail de teste (marcado [TESTE]) para o destinatário configurado. Não registra o dia. */
export async function sendTestDigest() {
  const { supabase } = await requireUser();

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.DIGEST_FROM_EMAIL?.trim();
  if (!apiKey || !from)
    flash(PATH, "erro", "Faltam RESEND_API_KEY ou DIGEST_FROM_EMAIL na Vercel (e um redeploy depois de salvar).");

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("recipient_email")
    .maybeSingle();
  const to = settings?.recipient_email?.trim() || process.env.DIGEST_TO_EMAIL?.trim();
  if (!to) flash(PATH, "erro", "Defina o destinatário aqui ou DIGEST_TO_EMAIL na Vercel.");

  const today = todayInZone();
  const [{ data: entities }, pay, rec] = await Promise.all([
    supabase.from("entities").select("id, name"),
    loadDueItems(supabase, "payable", EMPTY_FILTERS, null, today),
    loadDueItems(supabase, "receivable", EMPTY_FILTERS, null, today),
  ]);
  if (pay.failed || rec.failed) flash(PATH, "erro", "Não foi possível carregar os lançamentos para o teste.");

  const digest = buildDigest({
    today,
    payables: pay.items,
    receivables: rec.items,
    entityNames: Object.fromEntries((entities ?? []).map((e) => [e.id as string, e.name as string])),
    truncated: pay.truncated || rec.truncated,
  });

  const mail = await sendMail({
    apiKey: apiKey!,
    from: from!,
    to: to!,
    subject: `[TESTE] ${digest.subject}`,
    html: renderHtml(digest),
    text: renderText(digest),
  });
  if (!mail.ok) flash(PATH, "erro", `Não enviou: ${mail.error}`);

  flash(PATH, "ok", `E-mail de teste enviado para ${to}. Confira a caixa de entrada e o spam.`);
}
