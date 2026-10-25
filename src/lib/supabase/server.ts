import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Cliente do Supabase para Server Components e Server Actions.
 * Usa a chave pública (anon) + a sessão do usuário nos cookies, então a RLS se aplica.
 * Nunca usa a service_role.
 */
export async function createClient() {
  // Ler os cookies primeiro: é um acesso por requisição (nunca roda no build).
  const cookieStore = await cookies();

  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.",
    );
  }

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component (cookies somente leitura).
          // O proxy já renova a sessão, então é seguro ignorar.
        }
      },
    },
  });
}
