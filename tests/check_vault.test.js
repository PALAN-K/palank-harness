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

test("(a) index-parity mismatch fails strict check", () => {
  const dir = makeVault();
  try {
    fs.mkdirSync(path.join(dir, "raw", "notes"), { recursive: true });
    fs.writeFileSync(path.join(dir, "raw", "notes", "evidence.md"), "evidence\n");
    fs.mkdirSync(path.join(dir, "wiki", "concepts"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "wiki", "concepts", "x.md"),
      "# X\n\n> Raw: raw/notes/evidence.md\n"
    );
    // index declares ZERO bullets while one wiki file exists -> mismatch
    fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\n## concepts\n(no pages yet)\n");
    const r = run(dir);
    assert.notEqual(r.status, 0, `expected failure, got: ${r.stdout}`);
    assert.match(r.stdout, /index parity mismatch/);
    assert.match(r.stdout, /check_vault: [1-9]\d* errors/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("(b) Vault-Base hash-unreachable fails strict check (git repo)", () => {
  const dir = makeVault();
  try {
    const init = spawnSync("git", ["init"], { cwd: dir, encoding: "utf8" });
    assert.equal(init.status, 0, `git init failed: ${init.stderr}`);
    fs.mkdirSync(path.join(dir, "raw", "notes"), { recursive: true });
    fs.writeFileSync(path.join(dir, "raw", "notes", "evidence.md"), "evidence\n");
    fs.mkdirSync(path.join(dir, "wiki", "concepts"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "wiki", "concepts", "x.md"),
      "# X\n\nVault-Base: git:deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n\n> Raw: raw/notes/evidence.md\n"
    );
    fs.writeFileSync(
      path.join(dir, "index.md"),
      "# Index\n\n## concepts\n- [x](wiki/concepts/x.md) test page (2026-01-01)\n"
    );
    const r = run(dir);
    assert.notEqual(r.status, 0, `expected failure, got: ${r.stdout}`);
    assert.match(r.stdout, /hash unreachable: deadbeef/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("(c) broken markdown link target fails strict check", () => {
  const dir = makeVault();
  try {
    fs.mkdirSync(path.join(dir, "raw", "notes"), { recursive: true });
    fs.writeFileSync(path.join(dir, "raw", "notes", "evidence.md"), "evidence\n");
    fs.mkdirSync(path.join(dir, "wiki", "concepts"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "wiki", "concepts", "x.md"),
      "# X\n\n> Raw: raw/notes/evidence.md\n\nsee [good](index.md) and [bad](docs/nope.md)\n"
    );
    fs.writeFileSync(
      path.join(dir, "index.md"),
      "# Index\n\n## concepts\n- [x](wiki/concepts/x.md) test page (2026-01-01)\n"
    );
    const r = run(dir);
    assert.notEqual(r.status, 0, `expected failure, got: ${r.stdout}`);
    assert.match(r.stdout, /markdown link target not found -> docs\/nope\.md/);
    assert.doesNotMatch(r.stdout, /-> index\.md/); // good root-relative link passes
    assert.match(r.stdout, /markdown link check ran \(3 relative links\)/); // index bullet + good + bad
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
