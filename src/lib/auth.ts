import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Exige usuário logado. Use em toda Server Action e página protegida:
 * o proxy é só uma barreira otimista, esta é a verificação real.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Mensagens de retorno (flash) via query string: texto curto, sempre renderizado como texto simples. */
export function flash(path: string, kind: "ok" | "erro", message: string): never {
  const params = new URLSearchParams({ [kind]: message.slice(0, 200) });
  redirect(`${path}${path.includes("?") ? "&" : "?"}${params.toString()}`);
}
