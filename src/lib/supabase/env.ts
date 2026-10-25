// Lê as variáveis públicas do Supabase. Retorna null se ainda não configuradas,
// para que o app mostre um aviso em vez de quebrar.

export interface SupabaseEnv {
  url: string;
  key: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}
