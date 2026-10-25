"use server";

import { redirect } from "next/navigation";
import { classifyLoginError, safeErrorDetail } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?erro=credenciais");

  let kind: ReturnType<typeof classifyLoginError> | null = null;
  let detail = "";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      kind = classifyLoginError(error);
      if (kind === "outro") detail = safeErrorDetail(error);
    }
  } catch (e) {
    // Falha inesperada. redirect() fica fora do try, pois funciona lançando um erro.
    kind = "conexao";
    detail = e instanceof Error ? safeErrorDetail({ name: e.name }) : "";
  }

  if (kind) {
    const extra = detail ? `&detalhe=${encodeURIComponent(detail)}` : "";
    redirect(`/login?erro=${kind}${extra}`);
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
