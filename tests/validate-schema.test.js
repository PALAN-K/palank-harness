import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSchema } from "../scripts/validate-schema.js";

const VALID = {
  intent: "P0 복구 — force-delegation 가드를 공식 계약으로 재작성",
  files: ["plugins/force-delegation.js", "tests/plugin-wiring.test.js"],
  schema: { kind: "fix", risk: "runtime-guard" },
  opencode_call: "opencode run --agent verify 'npm run verify'",
  model: "opencode-go/muse-spark-1.2-contributor",
  mcp: { palank_domain: ["search_wiki"] },
  echo: { summary: "작업은 가드 재작성, 범위는 plugins+tests, 결과물은 통과 게이트.", confirmed: true },
};

test("valid Lock schema passes (all required fields, echo.confirmed=true)", () => {
  const r = validateSchema(VALID);
  assert.equal(r.valid, true, `errors: ${r.errors.join("; ")}`);
});

test("missing required fields are rejected (each named)", () => {
  for (const key of [
    "intent",
    "files",
    "schema",
    "opencode_call",
    "model",
    "mcp",
    "echo",
  ]) {
    const clone = { ...VALID };
    delete clone[key];
    const r = validateSchema(clone);
    assert.equal(r.valid, false, `${key} removal must invalidate`);
    assert.ok(r.errors.some((e) => e.includes(key)), `error should mention ${key}`);
  }
});

test("echo.confirmed must be STRICT boolean true", () => {
  for (const bad of [false, "true", 1, null, undefined]) {
    const clone = { ...VALID, echo: { ...VALID.echo, confirmed: bad } };
    const r = validateSchema(clone);
    assert.equal(r.valid, false, `confirmed=${JSON.stringify(bad)} must be rejected`);
  }
});

test("non-object payloads and empty strings are rejected", () => {
  assert.equal(validateSchema(null).valid, false);
  assert.equal(validateSchema("schema").valid, false);
  assert.equal(validateSchema([VALID]).valid, false);
  const emptyIntent = { ...VALID, intent: "   " };
  assert.equal(validateSchema(emptyIntent).valid, false);
});
