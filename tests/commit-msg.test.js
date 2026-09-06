import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "..", "scripts", "commit-msg");

function runWithMsg(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "commit-msg-test-"));
  const file = path.join(dir, "MSG");
  fs.writeFileSync(file, content, "utf8");
  try {
    const r = spawnSync("sh", [HOOK, file], { encoding: "utf8" });
    return r;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("pass: type + token + Vault-Base => exit 0", () => {
  const r = runWithMsg("feat(hooks): commit-msg gate [verify PASS]\n\nVault-Base: git:HEAD\n");
  assert.equal(r.status, 0, `stdout=${r.stdout} stderr=${r.stderr}`);
  assert.doesNotMatch(String(r.stdout || ""), /BLOCKED/);
});

test("block: missing type or token => exit 1 + example", () => {
  const noType = runWithMsg("update stuff [verify PASS]\n");
  assert.equal(noType.status, 1, `expected block, got ${noType.stdout}`);
  assert.match(String(noType.stdout || ""), /type prefix/);
  assert.match(String(noType.stdout || ""), /ex: feat\(hooks\)/);

  const noToken = runWithMsg("feat(hooks): commit-msg gate\n");
  assert.equal(noToken.status, 1, `expected block, got ${noToken.stdout}`);
  assert.match(String(noToken.stdout || ""), /verify PASS/);
});

test("advisory: missing Vault-Base => exit 0 + WARNING", () => {
  const r = runWithMsg("fix(hooks): typo [verify PASS]\n");
  assert.equal(r.status, 0, `stdout=${r.stdout} stderr=${r.stderr}`);
  assert.match(String(r.stdout || ""), /WARNING.*Vault-Base/);
});
