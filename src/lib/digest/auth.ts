import { timingSafeEqual } from "node:crypto";

/** Confere "Authorization: Bearer <segredo>" sem vazar o tamanho/conteúdo por tempo de resposta. */
export function isAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
