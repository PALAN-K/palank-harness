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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orphan-test-"));
  fs.mkdirSync(path.join(dir, "wiki"), { recursive: true });
  return dir;
}

function seedCitedPage(dir) {
  fs.mkdirSync(path.join(dir, "raw", "notes"), { recursive: true });
  fs.writeFileSync(path.join(dir, "raw", "notes", "used.md"), "used evidence\n");
  fs.mkdirSync(path.join(dir, "wiki", "concepts"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "wiki", "concepts", "x.md"),
    "# X\n\n> Raw: raw/notes/used.md\n"
  );
  fs.writeFileSync(
    path.join(dir, "index.md"),
    "# Index\n\n## concepts\n- [x](wiki/concepts/x.md) test page (2026-01-01)\n"
  );
}

test("(g) orphan raw is WARNING-only — strict still passes (fail-open)", () => {
  const dir = makeVault();
  try {
    seedCitedPage(dir);
    // uncited raw-only asset (ADR/inventory pattern) — must warn, never error
    fs.writeFileSync(path.join(dir, "raw", "notes", "orphan-adr.md"), "# ADR draft (raw-only)\n");
    const r = spawnSync(process.execPath, [CHECKER, "--strict", dir], { encoding: "utf8" });
    assert.equal(r.status, 0, `orphan must not fail strict, got: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stdout, /orphan raw \(uncited, advisory only\): raw\/notes\/orphan-adr\.md/);
    assert.match(r.stdout, /check_vault: 0 errors/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("(g) fully-cited raw reports ok with no orphan warning", () => {
  const dir = makeVault();
  try {
    seedCitedPage(dir);
    const r = spawnSync(process.execPath, [CHECKER, "--strict", dir], { encoding: "utf8" });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /orphan-raw check ok \(1 raw files cited\)/);
    assert.doesNotMatch(r.stdout, /orphan raw \(uncited/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
