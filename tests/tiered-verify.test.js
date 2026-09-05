import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isBlacklisted,
  evaluateTier,
  isVersionTokenTouched,
  getEvidencePath,
  MAX_FILES,
  MAX_TOTAL_LINES,
  BLACKLIST,
} from "../scripts/tiered-verify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const __opencode = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../opencode.json"), "utf8"));
const SMALL_MODEL = __opencode.small_model;

// Helper to build fixture state
function fixture({ files = [], untracked = [], diffContent = "", totalLines } = {}) {
  const tracked = files.map((f) => {
    if (typeof f === "string") return { file: f, added: 2, deleted: 0 };
    return { file: f.file, added: f.added ?? 2, deleted: f.deleted ?? 0 };
  });
  const calcTotal =
    typeof totalLines === "number"
      ? totalLines
      : tracked.reduce((s, x) => s + x.added + x.deleted, 0);
  const allFiles = [...tracked.map((t) => t.file), ...untracked];
  return { tracked, untracked, diffContent, totalLines: calcTotal, allFiles };
}

// ── P-1: raw single file ≤5 lines => SKIPPED ──
test("P-1 raw single file ≤5 lines => SKIPPED", () => {
  const state = fixture({ files: [{ file: "raw/notes.md", added: 3, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "SKIPPED", `reason: ${r.reason}`);
  assert.ok(r.evidence, "SKIPPED must have evidence");
  assert.equal(r.evidence.files[0], "raw/notes.md");
});

// ── P-2: wiki single file ≤5 lines => QUICK (격상) ──
test("P-2 wiki single file ≤5 lines => QUICK (wiki 격상)", () => {
  const state = fixture({ files: [{ file: "wiki/concepts/foo.md", added: 2, deleted: 1 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "QUICK", `reason: ${r.reason}`);
  assert.equal(r.evidence, null);
});

// ── N-1 Blacklist bypass attempt => FULL ──
test("N-1 blacklist bypass: AGENTS.md modification => FULL", () => {
  const state = fixture({ files: [{ file: "AGENTS.md", added: 1, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
  assert.match(r.reason, /blacklist/i);
});

test("N-1 blacklist: scripts/foo.js => FULL", () => {
  const state = fixture({ files: [{ file: "scripts/tiered-verify.js", added: 1, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
});

test("N-1 blacklist: skills/interpreter/SKILL.md => FULL", () => {
  const state = fixture({ files: [{ file: "skills/interpreter/SKILL.md", added: 1, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
});

test("N-1 blacklist: plugins/force-delegation.js => FULL", () => {
  const state = fixture({ files: [{ file: "plugins/force-delegation.js", added: 1, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
});

// ── N-2 .js 위장 (non-.md) => FULL ──
test("N-2 .js disguise: raw/file.js => FULL", () => {
  const state = fixture({ files: [{ file: "raw/file.js", added: 2, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
  assert.match(r.reason, /non-\.md|blacklist/);
});

test("N-2 .js disguise: README.md + hidden .js via second file => FULL", () => {
  const state = fixture({
    files: [
      { file: "raw/notes.md", added: 1, deleted: 0 },
      { file: "raw/evil.js", added: 1, deleted: 0 },
    ],
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
});

// ── N-3 file count exceed => FULL ──
test("N-3 file count exceed (3 files) => FULL", () => {
  const state = fixture({
    files: [
      { file: "raw/a.md", added: 1, deleted: 0 },
      { file: "raw/b.md", added: 1, deleted: 0 },
      { file: "raw/c.md", added: 1, deleted: 0 },
    ],
  });
  assert.equal(state.allFiles.length, 3);
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
  assert.match(r.reason, /file count/);
});

test("N-3 file count exactly 2 with .md and ≤10 lines => QUICK (boundary)", () => {
  const state = fixture({
    files: [
      { file: "raw/a.md", added: 2, deleted: 0 },
      { file: "raw/b.md", added: 2, deleted: 0 },
    ],
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "QUICK");
});

// ── N-4 untracked 1 file => FULL (Fail-Closed) ──
test("N-4 untracked single file => FULL (even if .md)", () => {
  const state = fixture({
    files: [{ file: "raw/notes.md", added: 1, deleted: 0 }],
    untracked: ["raw/untracked.md"],
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
  assert.match(r.reason, /untracked/i);
});

test("N-4 untracked non-.md => FULL", () => {
  const state = fixture({
    files: [],
    untracked: ["evil.js"],
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
});

// ── H1 version token touch => FULL (even if trivial body) ──
test("H1 version token touch README.md => FULL", () => {
  const state = fixture({
    files: [{ file: "README.md", added: 1, deleted: 0 }],
    diffContent: "diff --git a/README.md b/README.md\n+# palank-harness v3.3 -- new version\n",
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
  assert.match(r.reason, /version token/i);
});

test("H1 version token touch AGENTS.md => FULL", () => {
  const state = fixture({
    files: [{ file: "AGENTS.md", added: 1, deleted: 0 }],
    diffContent: "diff --git a/AGENTS.md b/AGENTS.md\n+# AGENTS.md — palank-harness v3.3\n",
  });
  // Even without diffContent file check, isVersionTokenTouched should detect
  // But since AGENTS.md is already blacklist, it will be FULL anyway. Test diff path separately:
  const r2 = evaluateTier({
    tracked: [{ file: "README.md", added: 1, deleted: 0 }],
    untracked: [],
    diffContent: "+# palank-harness v9.9\n",
    totalLines: 1,
    allFiles: ["README.md"],
  });
  assert.equal(r2.tier, "FULL");
});

test("README body change without H1 (≤5 lines) => SKIPPED", () => {
  const state = fixture({
    files: [{ file: "README.md", added: 2, deleted: 0 }],
    diffContent: "diff --git a/README.md b/README.md\n+some body text\n",
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "SKIPPED");
});

// ── Threshold 11-30 .md only => QUICK ──
test("11-30 lines all .md => QUICK", () => {
  const state = fixture({
    files: [{ file: "raw/notes.md", added: 12, deleted: 0 }],
  });
  const r = evaluateTier(state);
  assert.equal(r.tier, "QUICK");
});

test("11-30 lines with non-.md => FULL", () => {
  const state = fixture({
    files: [{ file: "raw/notes.md", added: 12, deleted: 0 }],
    // but include non-md via second file would be 2 files, but we need totalLines >10 and non-md
    // Instead single non-md file with 12 lines
  });
  // single non-md case is already FULL via ext, but also test 2 files mix
  const state2 = fixture({
    files: [
      { file: "raw/a.md", added: 6, deleted: 0 },
      { file: "raw/b.js", added: 6, deleted: 0 },
    ],
  });
  const r2 = evaluateTier(state2);
  assert.equal(r2.tier, "FULL");
});

test(">30 lines => FULL even if .md", () => {
  const state = fixture({ files: [{ file: "raw/notes.md", added: 31, deleted: 0 }] });
  const r = evaluateTier(state);
  assert.equal(r.tier, "FULL");
});

// ── isBlacklisted unit ──
test("isBlacklisted respects glob ** and exact", () => {
  assert.equal(isBlacklisted("scripts/tiered-verify.js"), true);
  assert.equal(isBlacklisted("scripts/nested/foo.js"), true);
  assert.equal(isBlacklisted("plugins/force-delegation.js"), true);
  assert.equal(isBlacklisted("skills/verify/SKILL.md"), true);
  assert.equal(isBlacklisted("mcp/server.js"), true);
  assert.equal(isBlacklisted("mcp/package.json"), true);
  assert.equal(isBlacklisted("package.json"), true);
  assert.equal(isBlacklisted("AGENTS.md"), true);
  assert.equal(isBlacklisted("opencode.json"), true);
  assert.equal(isBlacklisted("raw/notes.md"), false);
  assert.equal(isBlacklisted("wiki/page.md"), false);
  assert.equal(isBlacklisted("README.md"), false);
  assert.equal(isBlacklisted("index.md"), false);
});

// ── isVersionTokenTouched helper ──
test("isVersionTokenTouched detects H1 version", () => {
  assert.equal(isVersionTokenTouched("+# palank-harness v3.3", ["README.md"]), true);
  assert.equal(isVersionTokenTouched("+# AGENTS.md — palank-harness v3.2", ["AGENTS.md"]), true);
  assert.equal(isVersionTokenTouched("+some body v3.3 not H1", ["README.md"]), false);
  assert.equal(isVersionTokenTouched("+# palank-harness v3.3", ["raw/notes.md"]), false); // not target file
});

// ── CLI --fixture --check emits JSON and correct exit codes ──
test("CLI --fixture SKIPPED emits JSON line and exit 0 with sidecar", () => {
  const payload = JSON.stringify({
    files: [{ file: "raw/notes.md", added: 2, deleted: 0 }],
    untracked: [],
    diffContent: "",
  });
  const r = spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--fixture", payload, "--check"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.equal(r.status, 0, `expected exit 0 for SKIPPED, got ${r.status} stdout=${r.stdout} stderr=${r.stderr}`);
  const line = String(r.stdout || "").trim().split("\n").pop();
  const obj = JSON.parse(line);
  assert.equal(obj.tier, "SKIPPED");
  assert.ok(obj.evidence);
  assert.ok(obj.evidence.files.includes("raw/notes.md"));
  // sidecar exists
  const sidecar = fs.readFileSync(getEvidencePath(), "utf8").trim();
  const sideObj = JSON.parse(sidecar);
  assert.equal(sideObj.tier, "SKIPPED");
  // cleanup
  try {
    fs.unlinkSync(getEvidencePath());
  } catch {}
});

test("CLI --fixture QUICK exits 1", () => {
  const payload = JSON.stringify({
    files: [{ file: "wiki/concepts/foo.md", added: 2, deleted: 0 }],
    untracked: [],
  });
  const r = spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--fixture", payload, "--check"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.equal(r.status, 1);
  const obj = JSON.parse(String(r.stdout || "").trim().split("\n").pop());
  assert.equal(obj.tier, "QUICK");
});

test("CLI --fixture FULL (blacklist) exits 1", () => {
  const payload = JSON.stringify({
    files: [{ file: "AGENTS.md", added: 1, deleted: 0 }],
    untracked: [],
  });
  const r = spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--fixture", payload, "--check"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.equal(r.status, 1);
  const obj = JSON.parse(String(r.stdout || "").trim().split("\n").pop());
  assert.equal(obj.tier, "FULL");
});

test("CLI --fixture untracked => FULL exit 1", () => {
  const payload = JSON.stringify({
    files: [],
    untracked: ["raw/new.md"],
  });
  const r = spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--fixture", payload, "--check"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.equal(r.status, 1);
  const obj = JSON.parse(String(r.stdout || "").trim().split("\n").pop());
  assert.equal(obj.tier, "FULL");
});

test("CLI --dry-run does not write sidecar", () => {
  const payload = JSON.stringify({
    files: [{ file: "raw/notes.md", added: 1, deleted: 0 }],
    untracked: [],
  });
  // ensure no sidecar before
  try {
    fs.unlinkSync(getEvidencePath());
  } catch {}
  const r = spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--fixture", payload, "--dry-run"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.equal(r.status, 0);
  assert.equal(fs.existsSync(getEvidencePath()), false);
});

// ── P1 CQS: --check query-only, --log explicit audit ──
test("P1 CQS: --check is query-only (history +0, 2x same tier)", () => {
  const histPath = path.join(ROOT, "foundry/verify-history.jsonl");
  const readLines = () => {
    try {
      const c = fs.readFileSync(histPath, "utf8");
      if (!c.trim()) return [];
      return c.trim().split("\n");
    } catch {
      return [];
    }
  };
  const before = readLines().length;
  const runCheck = () =>
    spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--check"], {
      encoding: "utf8",
      cwd: ROOT,
    });
  const r1 = runCheck();
  const r2 = runCheck();
  assert.ok(r1.status === 0 || r1.status === 1, `first --check exit ${r1.status} stderr=${r1.stderr}`);
  assert.ok(r2.status === 0 || r2.status === 1, `second --check exit ${r2.status} stderr=${r2.stderr}`);
  const o1 = JSON.parse(String(r1.stdout).trim().split("\n").pop());
  const o2 = JSON.parse(String(r2.stdout).trim().split("\n").pop());
  assert.equal(o1.tier, o2.tier, "2x same tier");
  assert.equal(o1.reason, o2.reason, "2x same reason");
  const after = readLines().length;
  assert.equal(after, before, `CQS: --check must not append history (before=${before} after=${after})`);
});

test("P1 CQS: --check --log appends exactly 1 line", () => {
  const histPath = path.join(ROOT, "foundry/verify-history.jsonl");
  const readRaw = () => {
    try {
      return fs.readFileSync(histPath, "utf8");
    } catch {
      return "";
    }
  };
  const countLines = (s) => (!s.trim() ? 0 : s.trim().split("\n").length);
  const beforeRaw = readRaw();
  const before = countLines(beforeRaw);
  const r = spawnSync("node", [path.join(ROOT, "scripts/tiered-verify.js"), "--check", "--log"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.ok(r.status === 0 || r.status === 1, `--check --log exit ${r.status} stderr=${r.stderr}`);
  const afterRaw = readRaw();
  const after = countLines(afterRaw);
  assert.equal(after, before + 1, `CQS: --check --log must append 1 (before=${before} after=${after})`);
  const last = afterRaw.trim().split("\n").pop();
  const obj = JSON.parse(last);
  assert.ok(["FULL", "QUICK", "SKIPPED"].includes(obj.tier), `logged tier valid, got ${obj.tier}`);
  // cleanup: restore to keep tests idempotent (net 0)
  try {
    fs.writeFileSync(histPath, beforeRaw, "utf8");
  } catch {}
});

// ── validate-schema trivial validation (fail-closed) ──
test("validateSchema rejects SKIPPED without evidence (fail-closed)", async () => {
  const { validateSchema } = await import("../scripts/validate-schema.js");
  const base = {
    intent: "x",
    files: ["raw/notes.md"],
    schema: {},
    opencode_call: "npm run verify:tiered",
    model: SMALL_MODEL,
    mcp: "palank-domain",
    echo: { summary: "test", confirmed: true },
  };
  const bad = { ...base, trivial: { tier: "SKIPPED", reason: "trivial", evidence: null } };
  const r = validateSchema(bad);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("evidence")));

  const bad2 = { ...base, trivial: { tier: "SKIPPED", reason: "trivial", evidence: {} } };
  const r2 = validateSchema(bad2);
  assert.equal(r2.valid, false);

  const good = { ...base, trivial: { tier: "SKIPPED", reason: "trivial", evidence: { files: ["raw/notes.md"], totalLines: 2 } } };
  const r3 = validateSchema(good);
  assert.equal(r3.valid, true);
});
