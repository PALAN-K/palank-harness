import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = path.join(__dirname, "..", "scripts", "check_vault.js");
const INVENTORY = path.join(__dirname, "..", "scripts", "inventory.js");
const REPO_ROOT = path.join(__dirname, "..");

function makeVaultWithUNC() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unc-test-"));
  fs.mkdirSync(path.join(dir, "wiki"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\n## concepts\n(no pages yet)\n");
  // UNC string inside opencode.json content triggers the guard's content scan
  fs.writeFileSync(
    path.join(dir, "opencode.json"),
    JSON.stringify({ note: "\\\\wsl.localhost\\Ubuntu\\home\\jayeo\\projects\\x" })
  );
  return dir;
}

test("(f) UNC content without --strict => WARNING only, exit 0 (fail-open)", () => {
  const dir = makeVaultWithUNC();
  try {
    const r = spawnSync(process.execPath, [CHECKER, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, `non-strict must pass, got: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stdout, /WARNING: WSL UNC path forbidden/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("(f) UNC content with --strict => FAIL, exit 1 (fail-closed)", () => {
  const dir = makeVaultWithUNC();
  try {
    const r = spawnSync(process.execPath, [CHECKER, "--strict", dir], { encoding: "utf8" });
    assert.notEqual(r.status, 0, `strict must fail, got: ${r.stdout}`);
    assert.match(r.stdout, /FAIL: WSL UNC path forbidden/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("inventory --strict passes on the clean repo (3 live agents)", () => {
  const r = spawnSync(process.execPath, [INVENTORY, "--strict"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 60000,
  });
  assert.equal(r.status, 0, `inventory --strict must pass, stderr: ${r.stderr}`);
  const inv = JSON.parse(r.stdout);
  const names = (inv.agents || []).map((a) => a.name);
  for (const expected of ["conductor", "interpreter", "verify"]) {
    assert.ok(names.includes(expected), `missing agent ${expected} in ${names.join(",")}`);
  }
});
