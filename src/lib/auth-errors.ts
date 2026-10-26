// Classifica falhas de login em categorias seguras para mostrar ao usuário.
// Nunca repassa a mensagem bruta do Supabase. Supabase responde "invalid_credentials"
// tanto para senha errada quanto para e-mail inexistente, então não há vazamento de contas.

export type LoginErrorKind =
  | "credenciais" // e-mail ou senha incorretos
  | "nao_confirmado" // usuário existe mas não confirmou o e-mail
  | "conexao" // não foi possível falar com o Supabase (URL errada, fora do ar)
  | "endereco" // o Supabase respondeu 404: a URL aponta para o lugar errado
  | "chave" // chave pública (anon/publishable) rejeitada
  | "limite" // muitas tentativas
  | "outro";

export const LOGIN_ERROR_MESSAGE: Record<LoginErrorKind, string> = {
  credenciais: "E-mail ou senha inválidos.",
  nao_confirmado: "Este usuário ainda não foi confirmado no Supabase.",
  conexao:
    "Não foi possível conectar ao Supabase. Confira a variável NEXT_PUBLIC_SUPABASE_URL na Vercel e faça um Redeploy.",
  endereco:
    "O endereço do Supabase parece incorreto (erro 404). Confira NEXT_PUBLIC_SUPABASE_URL na Vercel: deve ser a Project URL, no formato https://xxxxxxxx.supabase.co, e o projeto não pode estar pausado. Depois faça um Redeploy.",
  chave:
    "O Supabase recusou a chave pública. Confira NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel (use a chave pública, não a secreta) e faça um Redeploy.",
  limite: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  outro: "Não foi possível entrar. Tente novamente.",
};

export function isLoginErrorKind(value: string): value is LoginErrorKind {
  return value in LOGIN_ERROR_MESSAGE;
}

interface AuthErrorLike {
  name?: string;
  status?: number;
  code?: string;
  message?: string;
}

/** Detalhe técnico seguro (status + código) para diagnosticar erros não classificados. */
export function safeErrorDetail(error: AuthErrorLike): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  const parts = [
    error.status !== undefined ? String(error.status) : "",
    clean(error.code ?? ""),
    clean(error.name ?? ""),
  ].filter(Boolean);
  return parts.join(" ");
}

export function classifyLoginError(error: AuthErrorLike): LoginErrorKind {
  const code = error.code ?? "";
  const message = error.message ?? "";
  const status = error.status;

  if (code === "invalid_credentials") return "credenciais";
  if (code === "email_not_confirmed") return "nao_confirmado";
  if (code === "over_request_rate_limit" || status === 429) return "limite";
  if (status === 404) return "endereco";

  if (
    /api[\s_-]?key/i.test(message) ||
    code === "bad_jwt" ||
    code === "invalid_api_key" ||
    status === 401 ||
    status === 403
  )
    return "chave";

  if (
    error.name === "AuthRetryableFetchError" ||
    status === 0 ||
    status === undefined ||
    status >= 500
  )
    return "conexao";

  // Mensagens antigas do Supabase sem "code".
  if (/invalid login credentials/i.test(message)) return "credenciais";
  if (/email not confirmed/i.test(message)) return "nao_confirmado";

  return "outro";
}
