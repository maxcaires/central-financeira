import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Cliente com a chave de servidor (service_role): ignora a RLS.
 * Só para a rota do resumo diário, que roda sem usuário logado. Nunca importe em componentes ou
 * ações de tela, e sempre filtre por owner_id.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!env || !key) return null;
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
