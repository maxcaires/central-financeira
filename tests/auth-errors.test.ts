import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLoginError, isLoginErrorKind } from "../src/lib/auth-errors.ts";

test("senha errada ou e-mail inexistente", () => {
  assert.equal(
    classifyLoginError({ name: "AuthApiError", status: 400, code: "invalid_credentials" }),
    "credenciais",
  );
  assert.equal(
    classifyLoginError({ status: 400, message: "Invalid login credentials" }),
    "credenciais",
  );
});

test("usuário não confirmado", () => {
  assert.equal(
    classifyLoginError({ status: 400, code: "email_not_confirmed" }),
    "nao_confirmado",
  );
});

test("URL errada ou Supabase inacessível", () => {
  assert.equal(
    classifyLoginError({ name: "AuthRetryableFetchError", status: 0, message: "fetch failed" }),
    "conexao",
  );
  assert.equal(classifyLoginError({ name: "AuthUnknownError", message: "x" }), "conexao");
  assert.equal(classifyLoginError({ status: 503 }), "conexao");
});

test("chave pública recusada", () => {
  assert.equal(classifyLoginError({ status: 401, message: "Invalid API key" }), "chave");
  assert.equal(classifyLoginError({ status: 401, code: "bad_jwt" }), "chave");
  assert.equal(classifyLoginError({ status: 400, message: "No API key found in request" }), "chave");
});

test("limite de tentativas", () => {
  assert.equal(classifyLoginError({ status: 429, code: "over_request_rate_limit" }), "limite");
});

test("nunca devolve a mensagem bruta; só categorias conhecidas", () => {
  const kind = classifyLoginError({ status: 418, message: "segredo interno" });
  assert.equal(kind, "outro");
  assert.equal(isLoginErrorKind(kind), true);
  assert.equal(isLoginErrorKind("<script>"), false);
});

import { safeErrorDetail } from "../src/lib/auth-errors.ts";

test("safeErrorDetail devolve só status/código/nome, sem a mensagem", () => {
  const d = safeErrorDetail({
    status: 400,
    code: "Some_Code!",
    name: "AuthApiError",
    message: "token secreto abc123",
  });
  assert.equal(d, "400 some_code authapierror");
  assert.equal(d.includes("secreto"), false);
});
