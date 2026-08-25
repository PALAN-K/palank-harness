import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = path.join(__dirname, "..", "scripts", "check_vault.js");

function makeVault() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-test-"));
  fs.mkdirSync(path.join(dir, "wiki"));
  return dir;
}

function run(vaultDir) {
  return spawnSync(process.execPath, [CHECKER, "--strict", vaultDir], { encoding: "utf8" });
}

test("empty vault is a valid PASS skeleton", () => {
  const dir = makeVault();
  try {
    fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\n## concepts\n(no pages yet)\n");
    const r = run(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /skeleton vault/);
    assert.match(r.stdout, /check_vault: 0 errors/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("page without '> Raw:' fails strict check", () => {
  const dir = makeVault();
  try {
    fs.mkdirSync(path.join(dir, "wiki", "concepts"), { recursive: true });
    fs.writeFileSync(path.join(dir, "wiki", "concepts", "x.md"), "# X\n\nno citation here\n");
    fs.writeFileSync(
      path.join(dir, "index.md"),
      "# Index\n\n## concepts\n- [x](wiki/concepts/x.md) test page (2026-01-01)\n"
    );
    const r = run(dir);
    assert.notEqual(r.status, 0, `expected failure, got: ${r.stdout}`);
    assert.match(r.stdout, /missing required '> Raw:' citation/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
