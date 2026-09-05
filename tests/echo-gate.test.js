import { test } from "node:test";
import assert from "node:assert/strict";
import { taskGateOk } from "../plugins/force-delegation.js";

test("blocks Task prompts without gate marker (fail-closed)", () => {
  for (const prompt of [
    undefined,
    null,
    "",
    "fix the login bug in auth.js",
    "summary confirmed by user", // summary alone is NOT the marker
    "gate:echo-pending",
    "gate:confirmed",
    "GATE:ECHO-CONFIRMED", // case-sensitive by design
  ]) {
    assert.equal(taskGateOk(prompt), false, `should block: ${String(prompt)}`);
  }
});

test("allows Task prompts declaring gate:echo-confirmed", () => {
  for (const prompt of [
    "gate:echo-confirmed",
    "gate:echo-confirmed 작업은 로그인 버그 수정, 범위는 auth.js",
    "gate:echo-confirmed trailing marker\n",
  ]) {
    assert.equal(taskGateOk(prompt), true, `should allow: ${prompt}`);
  }
});

test("allows Task prompts declaring gate:research-exempt", () => {
  for (const prompt of [
    "gate:research-exempt",
    "gate:research-exempt research vault for cache policy",
  ]) {
    assert.equal(taskGateOk(prompt), true, `should allow: ${prompt}`);
  }
});
