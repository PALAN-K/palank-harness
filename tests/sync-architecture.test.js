import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYNC = path.join(__dirname, "..", "scripts", "sync-architecture.js");

function makeFixtureRoot(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "syncarch-test-"));
  const version = opts.version ?? "9.9.9";
  const overviewRows =
    opts.overviewRows ??
    [
      "| **1계층** | Conductor | 주 조율자 | `opencode.json` |",
      "| **3계층** | Vault | 지식 카탈로그 | `index.md` |",
    ];
  const overview = [
    "# 006 Overview — fixture",
    "",
    "Vault-Base: git:b14f1bbcfd574590a6cd13b5b662fa3e994bca2e",
    "",
    "> Raw: raw/notes/v3-charter.md",
    "",
    "| 계층 | 컴포넌트 | 담당 역할 | 소스 파일/경로 |",
    "|---|---|---|---|",
    ...overviewRows,
    "",
  ].join("\n");
  const pipeline =
    opts.pipeline ??
    [
      "# 006 Pipeline — fixture",
      "",
      "Vault-Base: git:b14f1bbcfd574590a6cd13b5b662fa3e994bca2e",
      "",
      "> Raw: raw/notes/v3-charter.md",
      "",
      "[사용자 입력 (일기장 프롬프트)]",
      "[1. Listen]",
      "",
    ].join("\n");
  const log =
    opts.log ??
    ["# Log — fixture", "", "## [2026-09-05] feat | fixture entry", "- hello fixture", ""].join("\n");

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "fixture", version, description: "fixture" }, null, 2) + "\n"
  );
  fs.mkdirSync(path.join(dir, "wiki", "architecture"), { recursive: true });
  fs.writeFileSync(path.join(dir, "wiki", "architecture", "006-overview.md"), overview);
  fs.writeFileSync(path.join(dir, "wiki", "architecture", "006-pipeline.md"), pipeline);
  fs.writeFileSync(path.join(dir, "log.md"), log);
  // allowlist targets that must exist for the default fixture
  fs.writeFileSync(path.join(dir, "opencode.json"), "{}\n");
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n");
  return dir;
}

function run(args) {
  return spawnSync(process.execPath, [SYNC, ...args], { encoding: "utf8" });
}

test("regen creates html with Tier rows + version match", () => {
  const dir = makeFixtureRoot();
  try {
    const r = run(["--root", dir]);
    assert.equal(r.status, 0, `apply failed:\n${r.stdout}\n${r.stderr}`);
    const htmlPath = path.join(dir, "architecture.html");
    assert.ok(fs.existsSync(htmlPath), "architecture.html should exist after regen");
    const html = fs.readFileSync(htmlPath, "utf-8");
    assert.match(html, /9\.9\.9/);
    assert.match(html, /Conductor/);
    assert.match(html, /Vault/);
    assert.match(html, /2 rows/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing package.json exits 1", () => {
  const dir = makeFixtureRoot();
  try {
    fs.rmSync(path.join(dir, "package.json"));
    const r = run(["--root", dir]);
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr + r.stdout, /missing SSOT.*package\.json/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing log.md exits 1", () => {
  const dir = makeFixtureRoot();
  try {
    fs.rmSync(path.join(dir, "log.md"));
    const r = run(["--root", dir]);
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr + r.stdout, /missing SSOT.*log\.md/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("idempotent: two runs produce identical bytes", () => {
  const dir = makeFixtureRoot();
  try {
    const r1 = run(["--root", dir]);
    assert.equal(r1.status, 0, `first run failed:\n${r1.stdout}\n${r1.stderr}`);
    const once = fs.readFileSync(path.join(dir, "architecture.html"));
    const r2 = run(["--root", dir]);
    assert.equal(r2.status, 0, `second run failed:\n${r2.stdout}\n${r2.stderr}`);
    const twice = fs.readFileSync(path.join(dir, "architecture.html"));
    assert.ok(once.equals(twice), "two regens must produce identical bytes (no timestamp)");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("esc() escapes XSS payloads", async () => {
  const mod = await import("../scripts/sync-architecture.js");
  assert.equal(typeof mod.esc, "function", "esc must be exported for tests");
  assert.equal(mod.esc("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(mod.esc("a&b"), "a&amp;b");
  assert.equal(mod.esc("x>y"), "x&gt;y");
});

test("--check detects stale html (FAIL exit 1) then passes when fresh", () => {
  const dir = makeFixtureRoot();
  try {
    const apply = run(["--root", dir]);
    assert.equal(apply.status, 0, `apply failed:\n${apply.stdout}\n${apply.stderr}`);

    // tamper -> stale
    fs.appendFileSync(path.join(dir, "architecture.html"), "<!-- stale -->\n");
    const stale = run(["--check", "--root", dir]);
    assert.equal(stale.status, 1, `expected stale exit 1, got ${stale.status}\n${stale.stdout}\n${stale.stderr}`);
    assert.match(
      stale.stdout + stale.stderr,
      /FAIL: architecture\.html is stale — run 'npm run sync:architecture'/
    );

    // re-apply -> fresh check passes
    const reapply = run(["--root", dir]);
    assert.equal(reapply.status, 0);
    const fresh = run(["--check", "--root", dir]);
    assert.equal(fresh.status, 0, `fresh --check failed:\n${fresh.stdout}\n${fresh.stderr}`);
    assert.match(fresh.stdout, /\[OK\].*0 errors/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("allowlist missing component warns [MISSING_COMPONENT] but still exits 0", () => {
  const dir = makeFixtureRoot({
    overviewRows: ["| **1계층** | Ghost | 없는 파일 | `nope/missing-ghost.js` |"],
  });
  try {
    const r = run(["--root", dir]);
    assert.equal(r.status, 0, `apply with ghost should still exit 0:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[MISSING_COMPONENT\].*nope\/missing-ghost\.js/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
