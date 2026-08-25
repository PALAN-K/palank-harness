import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYNC = path.join(__dirname, "..", "scripts", "sync-version.js");

/** Fixture root whose live tokens sit at v0.9 while the master says 9.9.9. */
function makeDriftedRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "syncver-test-"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      { name: "fixture", version: "9.9.9", description: "palank-harness v0.9 — fixture build" },
      null,
      2
    ) + "\n"
  );
  fs.mkdirSync(path.join(dir, "mcp"));
  fs.writeFileSync(
    path.join(dir, "mcp", "package.json"),
    JSON.stringify({ name: "fixture-mcp", version: "0.0.1" }, null, 2) + "\n"
  );
  fs.writeFileSync(
    path.join(dir, "mcp", "package-lock.json"),
    JSON.stringify(
      { name: "fixture-mcp", version: "0.0.1", lockfileVersion: 3, packages: { "": { version: "0.0.1" } } },
      null,
      2
    ) + "\n"
  );
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# AGENTS.md — palank-harness v0.9 (thin constitution)\n");
  fs.writeFileSync(path.join(dir, "README.md"), "# palank-harness v0.9 — fixture\n");
  return dir;
}

function run(args) {
  return spawnSync(process.execPath, [SYNC, ...args], { encoding: "utf8" });
}

test("--check exits nonzero and reports every drifted target on a drifted fixture", () => {
  const dir = makeDriftedRoot();
  try {
    const r = run(["--check", "--root", dir]);
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /master package\.json=9\.9\.9/);
    assert.match(r.stdout, /\[DRIFT\] mcp\/package\.json — version 0\.0\.1 -> 9\.9\.9/);
    assert.match(r.stdout, /\[DRIFT\] mcp\/package-lock\.json/);
    assert.match(r.stdout, /\[DRIFT\] AGENTS\.md — H1 token v0\.9 -> v9\.9/);
    assert.match(r.stdout, /\[DRIFT\] README\.md — H1 token v0\.9 -> v9\.9/);
    assert.match(r.stdout, /\[DRIFT\] package\.json — description token v0\.9 -> v9\.9/);
    assert.match(r.stdout, /5 targets, 5 drift, 0 error/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("apply fixes drift, then --check passes (idempotent round-trip)", () => {
  const dir = makeDriftedRoot();
  try {
    const apply = run(["--root", dir]);
    assert.equal(apply.status, 0, `apply failed:\n${apply.stdout}\n${apply.stderr}`);
    assert.match(apply.stdout, /fixed: version 0\.0\.1 -> 9\.9\.9/);

    const check = run(["--check", "--root", dir]);
    assert.equal(check.status, 0, `post-apply --check failed:\n${check.stdout}`);
    assert.match(check.stdout, /5 targets, 0 drift, 0 error/);

    // spot-check the written artifacts
    const mcpPkg = JSON.parse(fs.readFileSync(path.join(dir, "mcp", "package.json"), "utf-8"));
    assert.equal(mcpPkg.version, "9.9.9");
    const lock = JSON.parse(fs.readFileSync(path.join(dir, "mcp", "package-lock.json"), "utf-8"));
    assert.equal(lock.version, "9.9.9");
    assert.equal(lock.packages[""].version, "9.9.9");
    assert.match(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8"), /^# AGENTS\.md — palank-harness v9\.9 \(/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("real repo is in sync under plain --check (integration)", () => {
  const r = run(["--check"]);
  assert.equal(r.status, 0, `repo drifted:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /0 drift, 0 error/);
});
