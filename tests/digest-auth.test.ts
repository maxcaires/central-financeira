import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorized } from "../src/lib/digest/auth.ts";

const SECRET = "segredo-bem-longo-123456";

test("aceita só o Bearer exato", () => {
  assert.equal(isAuthorized(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(isAuthorized(`Bearer ${SECRET}x`, SECRET), false);
  assert.equal(isAuthorized(`bearer ${SECRET}`, SECRET), false);
  assert.equal(isAuthorized(SECRET, SECRET), false);
  assert.equal(isAuthorized(null, SECRET), false);
});

test("sem segredo configurado (ou curto demais) nunca autoriza", () => {
  assert.equal(isAuthorized("Bearer ", undefined), false);
  assert.equal(isAuthorized("Bearer abc", "abc"), false);
  assert.equal(isAuthorized("Bearer undefined", undefined), false);
});
