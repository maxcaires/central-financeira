import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Renova a sessão do Supabase e redireciona visitantes sem login para /login.
// É uma barreira otimista: a verificação real também é feita no layout do app
// e a RLS do banco protege os dados de qualquer forma.
export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) return NextResponse.next(); // sem chaves: o app mostra o aviso de configuração

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname === "/login";

  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Exclui arquivos estáticos e a rota do cron (que usa o próprio segredo, Etapa 7).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
