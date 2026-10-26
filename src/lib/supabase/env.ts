// Lê as variáveis públicas do Supabase. Retorna null se ainda não configuradas,
// para que o app mostre um aviso em vez de quebrar.

export interface SupabaseEnv {
  url: string;
  key: string;
}

/**
 * Reduz a URL ao endereço principal do projeto (https://xxxx.supabase.co).
 * Perdoa sobras comuns coladas por engano, como "/rest/v1", "/auth/v1" ou "/" no final,
 * que fariam o Supabase responder 404. Retorna null se não for uma URL http(s) válida.
 */
export function normalizeSupabaseUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !key) return null;

  const url = normalizeSupabaseUrl(rawUrl);
  if (!url) return null;
  return { url, key };
}
