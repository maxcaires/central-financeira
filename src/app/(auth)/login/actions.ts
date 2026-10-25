"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?erro=1");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Mensagem genérica: não revela se o e-mail existe.
  if (error) redirect("/login?erro=1");

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
