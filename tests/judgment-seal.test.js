import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHECKER = path.join(ROOT, "scripts", "check_vault.js");
const SKILL = path.join(ROOT, "skills", "verify", "SKILL.md");

function makeVault() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "judgment-seal-"));
  fs.mkdirSync(path.join(dir, "wiki", "notes"), { recursive: true });
  fs.mkdirSync(path.join(dir, "raw", "notes"), { recursive: true });
  return dir;
}

function snapshot(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.set(path.relative(dir, p), fs.readFileSync(p, "utf8"));
    }
  };
  walk(dir);
  return out;
}

// P1-2: judgment(모순·고아·구주장)가 파일 수정을 시도하면 FAIL —
// mechanical checker는 report-only여야 하며 vault를 변형해서는 안 된다.
test("P1-2 judgment seal: checker is report-only, never auto-fixes judgment inputs", () => {
  const dir = makeVault();
  try {
    // Fixture: orphan(인덱스 누락) + contradiction(상충 주장) + stale(구주장) — 모두 판단 영역
    fs.writeFileSync(path.join(dir, "raw", "notes", "evidence.md"), "evidence\n");
    fs.writeFileSync(
      path.join(dir, "wiki", "notes", "orphan.md"),
      "# Orphan\n\n> Raw: raw/notes/evidence.md\n\n이 페이지는 index에 없다 (고아).\n"
    );
    fs.writeFileSync(
      path.join(dir, "wiki", "notes", "stale.md"),
      "# Stale\n\n> Raw: raw/notes/evidence.md\n\nv1.0이 최신이다 (구주장, 모순).\n"
    );
    // index는 고의로 비워 judgment 입력(orphan/parity mismatch)을 만든다
    fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\n## notes\n(no pages yet)\n");

    const before = snapshot(dir);
    const r = spawnSync(process.execPath, [CHECKER, "--strict", dir], { encoding: "utf8" });
    // report-only: 오류를 보고해야지 조용히 통과·수정해서는 안 된다
    assert.notEqual(r.status, 0, `judgment inputs must be reported, got: ${r.stdout}`);
    assert.match(String(r.stdout), /parity mismatch|missing required|not found/i);
    // 봉인: checker 실행 후 vault 내용이 1바이트도 달라지면 FAIL (자동 수정 시도)
    const after = snapshot(dir);
    assert.deepEqual(
      [...after.entries()],
      [...before.entries()],
      "judgment path attempted file modification — auto-fix is forbidden (report-only)"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// P1-2: 문서 계약 봉인 — SKILL이 judgment report-only를 선언하지 않으면 FAIL
test("P1-2 judgment seal: verify SKILL declares judgment report-only (auto-fix banned)", () => {
  const content = fs.readFileSync(SKILL, "utf8");
  // Lint 섹션의 Judgment 선언이 살아있는지
  assert.match(content, /Judgment/, "SKILL must document Judgment category");
  assert.match(content, /report.only/i, "Judgment must be declared report-only");
  assert.match(content, /자동 수정 금지/, "Judgment must declare 자동 수정 금지");
  // Hard rules 봉인 1줄이 살아있는지 (삭제·완화 시 FAIL)
  const hardRules = content.split("## Hard rules")[1] ?? "";
  assert.match(hardRules, /Judgment/, "Hard rules must seal Judgment boundary");
  assert.match(hardRules, /자동 수정 금지/, "Hard rules must ban judgment auto-fix");
});
