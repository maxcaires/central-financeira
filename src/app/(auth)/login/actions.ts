"use server";

import { redirect } from "next/navigation";
import { classifyLoginError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?erro=credenciais");

  let kind: ReturnType<typeof classifyLoginError> | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) kind = classifyLoginError(error);
  } catch {
    // Falha inesperada (ex.: rede). redirect() fica fora do try, pois funciona lançando um erro.
    kind = "conexao";
  }

  if (kind) redirect(`/login?erro=${kind}`);
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
