#!/usr/bin/env node
/**
 * tiered-verify.js — Fail-Closed Tiered Verify (Phase 1)
 * ESM, Node stdlib only. 5-step tier determination with evidence.
 *
 * Thresholds (SSOT per spec):
 *  - max_files: 2
 *  - max_total_lines: 10 (11-30 .md only => QUICK)
 *  - allowed_ext: .md only
 * Blacklist (glob without minimatch, path+regex):
 *  ["AGENTS.md","opencode.json","package.json","package-lock.json",
 *   "mcp/package.json","mcp/package-lock.json",
 *   "scripts/**","plugins/**","mcp/**","skills/**"]
 *
 * Tier decision (Fail-Closed, priority order):
 *  1. Blacklist hit OR Untracked exists => FULL
 *  2. file count >2 => FULL
 *  3. totalLines >10 => FULL (11-30 .md only => QUICK)
 *  4. non-.md extension => FULL
 *  5. single file ≤5 lines raw/README body => SKIPPED (wiki => QUICK, H1 touch => FULL)
 *     otherwise that passes prior gates => QUICK
 *
 * Fail-Closed evidence:
 *  - SKIPPED must emit stdout JSON 1 line + write sidecar .verify-tier.json
 *  - evidence missing/tampered => exit 2
 *  - QUICK/FULL => exit 1 (delegation to verify)
 *  - SKIPPED with valid evidence => exit 0
 *
 * CLI:
 *  node scripts/tiered-verify.js --check        # determine from git, write sidecar if SKIPPED
 *  node scripts/tiered-verify.js --dry-run      # same but no sidecar
 *  node scripts/tiered-verify.js --fixture '<json>' --check # inject fake state for tests
 *  Fixture schema: { files:[{file,added,deleted}], untracked:[file], diffContent:string, totalLines?:number }
 *
 * Also exports for tests: isBlacklisted, evaluateTier, getGitState, getEvidencePath
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVIDENCE_PATH = path.join(ROOT, ".verify-tier.json");

// ── Config SSOT ──
export const MAX_FILES = 2;
export const MAX_TOTAL_LINES = 10;
export const MAX_QUICK_LINES = 30;
export const ALLOWED_EXT = ".md";
export const BLACKLIST = [
  "AGENTS.md",
  "opencode.json",
  "package.json",
  "package-lock.json",
  "mcp/package.json",
  "mcp/package-lock.json",
  "scripts/**",
  "plugins/**",
  "mcp/**",
  "skills/**",
];

export function getEvidencePath() {
  return EVIDENCE_PATH;
}

// ── Blacklist matcher (no minimatch) ──
export function isBlacklisted(file) {
  const f = String(file).replace(/\\/g, "/");
  for (const pat of BLACKLIST) {
    if (pat.endsWith("/**")) {
      const prefix = pat.slice(0, -3); // remove /** 
      if (f === prefix || f.startsWith(prefix + "/")) return true;
    } else {
      if (f === pat) return true;
    }
  }
  return false;
}

function isMd(file) {
  return String(file).toLowerCase().endsWith(ALLOWED_EXT);
}

function isWiki(file) {
  return String(file).startsWith("wiki/");
}
function isRaw(file) {
  return String(file).startsWith("raw/");
}

// ── Git state ──
function runGit(args, cwd = ROOT) {
  try {
    const r = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 8000 });
    if (r.status !== 0) return "";
    return String(r.stdout || "");
  } catch {
    return "";
  }
}

/**
 * Parse `git status --porcelain` for untracked files (??)
 */
function parsePorcelain(out) {
  const untracked = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    // porcelain v1: XY <path>  — untracked is "?? <path>"
    if (line.startsWith("??")) {
      const p = line.slice(3).trim();
      // handle quoted? not needed for our vault
      // if directory untracked, git may list directory; expand not needed — treat as one file entry
      // For test seam, directory case is rare.
      if (p) untracked.push(p);
    }
    // Also consider "!!" ignored? ignore
  }
  return untracked;
}

/**
 * Parse `git diff HEAD --numstat` => [{file, added, deleted}]
 * Lines: "<added>\t<deleted>\t<file>"
 * Binary: "-\t-\t<file>"
 */
function parseNumstat(out) {
  const files = [];
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    // numstat uses tab separator; file may contain spaces? Use split on tab
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const addedRaw = parts[0];
    const deletedRaw = parts[1];
    // file is rest joined by tab (in case filename contains tab? unlikely)
    const file = parts.slice(2).join("\t");
    // handle rename: "old => new" — git numstat may show "old\tnew" ? Actually with --numstat, rename shows "file" as new name if detection on, but we treat as is
    // If file contains " => ", extract new name after =>
    let finalFile = file;
    // git numstat for renames with -M may show "orig => dest" ? Check: git diff --numstat shows that
    if (file.includes(" => ")) {
      // e.g., "old.md => new.md" — take dest
      finalFile = file.split(" => ").pop().trim();
      // remove braces: "{old => new}.md" -> need to handle; simpler split => already
      // handle "{a => b}/file.md"
      // fallback: if braces present, extract between
      if (finalFile.includes("}")) {
        finalFile = finalFile.split("}").pop().trim();
        const prefix = file.split("{")[0];
        finalFile = (prefix + finalFile).replace(/\/\//g, "/");
      }
    }
    // trim
    finalFile = finalFile.trim();
    const added = addedRaw === "-" ? 0 : parseInt(addedRaw, 10) || 0;
    const deleted = deletedRaw === "-" ? 0 : parseInt(deletedRaw, 10) || 0;
    files.push({ file: finalFile, added, deleted });
  }
  return files;
}

/**
 * Detect version token H1 touch in diff.
 * Spec: README/AGENTS.md의 H1(버전 토큰) 터치 시 무조건 FULL
 * Pattern: /^\+# .*v\d+\.\d+/m  (added line starting with # and version)
 * Must also verify the diff is for README.md or AGENTS.md, but conservative: any H1 version add => FULL if any file is those.
 */
export function isVersionTokenTouched(diffContent, allFiles) {
  if (!diffContent) return false;
  // Check for added H1 with version token
  const h1Re = /^\+#.*v\d+\.\d+/m;
  if (!h1Re.test(diffContent)) return false;
  // If diff mentions README.md or AGENTS.md header, or allFiles contains them
  const hasTargetFile =
    allFiles.some((f) => f === "README.md" || f === "AGENTS.md") ||
    diffContent.includes("a/README.md") ||
    diffContent.includes("a/AGENTS.md") ||
    diffContent.includes("b/README.md") ||
    diffContent.includes("b/AGENTS.md");
  // Fail-closed: if H1 version pattern appears anywhere in diff, treat as FULL regardless of file?
  // But spec says only README/AGENTS H1. We'll be precise: require target file.
  // If hasTargetFile false but H1 pattern exists in diffContent for other file? That would be weird — but we still treat as FULL if H1 pattern exists and file is those? If not those, maybe it's unrelated H1 (e.g., wiki page with v1.0) but wiki page H1 shouldn't trigger. So we require target.
  // However to stay fail-closed, if H1 pattern appears and file is not README/AGENTS, we could not trigger. We'll implement hasTargetFile required.
  // For safety, also check if diffContent contains "diff --git a/README.md" or "a/AGENTS.md"
  if (hasTargetFile) return true;
  // Also check diffContent per-hunk file header proximity? Simplified: if H1 pattern found, scan diffContent hunks where file header is those.
  // We already did broad check.
  return false;
}

export function getGitState() {
  const porcelain = runGit(["status", "--porcelain"]);
  const untracked = parsePorcelain(porcelain);
  const numstatOut = runGit(["diff", "HEAD", "--numstat"]);
  const tracked = parseNumstat(numstatOut);
  const diffContent = runGit(["diff", "HEAD", "-U0", "--no-color"]);
  const totalLines = tracked.reduce((sum, f) => sum + f.added + f.deleted, 0);
  // Note: untracked line count not known; treat as needing FULL anyway via priority 1, so totalLines only for tracked.
  // For completeness, if untracked files exist, we could count their lines for evidence, but not needed for tier decision beyond FULL.
  // However to satisfy threshold logic for evidential purposes, we can add untracked file line counts by reading file.
  let untrackedLines = 0;
  for (const f of untracked) {
    try {
      const full = path.join(ROOT, f);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        const content = fs.readFileSync(full, "utf8");
        untrackedLines += content.split("\n").length;
      }
    } catch {}
  }
  return {
    tracked,
    untracked,
    diffContent,
    totalLines: totalLines + untrackedLines, // include for evidence, but tier 1 already FULL if untracked
    allFiles: [...tracked.map((t) => t.file), ...untracked],
  };
}

// ── Tier evaluation ──

/**
 * Core tier logic. Exported for tests (fixture injection).
 * @param {object} state { tracked:[{file,added,deleted}], untracked:[string], diffContent:string, totalLines:number, allFiles?:string[] }
 * Returns { tier:"FULL"|"QUICK"|"SKIPPED", reason:string, evidence:object }
 */
export function evaluateTier(state) {
  const tracked = state.tracked || [];
  const untracked = state.untracked || [];
  const diffContent = state.diffContent || "";
  const allFiles = state.allFiles || [...tracked.map((t) => t.file), ...untracked];
  const totalLines =
    typeof state.totalLines === "number"
      ? state.totalLines
      : tracked.reduce((s, f) => s + f.added + f.deleted, 0);

  const blacklistedHit = allFiles.find((f) => isBlacklisted(f));
  const hasUntracked = untracked.length > 0;
  const hasNonMd = allFiles.find((f) => !isMd(f));

  // Priority 1: Blacklist OR untracked => FULL
  // Spec 1순위: Blacklist hit 또는 Untracked 파일 존재 → FULL
  // Also spec edge: untracked가 1개라도 존재하거나 그 확장자가 .md 이외면 즉시 FULL — we implement any untracked => FULL
  if (blacklistedHit) {
    return {
      tier: "FULL",
      reason: `blacklist hit: ${blacklistedHit}`,
      evidence: null,
    };
  }
  if (hasUntracked) {
    // Check if untracked itself is blacklisted already handled, but still FULL
    // Also check extension for untracked: even if .md, still FULL per 1순위 untracked presence
    return {
      tier: "FULL",
      reason: `untracked files present: ${untracked.join(", ")}`,
      evidence: null,
    };
  }

  // Version token H1 guard: must be checked before SKIPPED/QUICK, as it forces FULL
  if (isVersionTokenTouched(diffContent, allFiles)) {
    return {
      tier: "FULL",
      reason: "version token H1 touched (README.md or AGENTS.md)",
      evidence: null,
    };
  }

  // Priority 2: file count >2 => FULL
  if (allFiles.length > MAX_FILES) {
    return {
      tier: "FULL",
      reason: `file count ${allFiles.length} > ${MAX_FILES}`,
      evidence: null,
    };
  }

  // Edge: no files? treat as FULL (no trivial change to skip)
  if (allFiles.length === 0) {
    return {
      tier: "FULL",
      reason: "no changed files (empty diff)",
      evidence: null,
    };
  }

  // Priority 3: line count thresholds
  if (totalLines > MAX_QUICK_LINES) {
    return {
      tier: "FULL",
      reason: `total lines ${totalLines} > ${MAX_QUICK_LINES}`,
      evidence: null,
    };
  }
  if (totalLines > MAX_TOTAL_LINES) {
    // 11-30 lines: only .md allowed => QUICK else FULL
    const allMd = allFiles.every((f) => isMd(f));
    if (allMd) {
      return {
        tier: "QUICK",
        reason: `total lines ${totalLines} in 11-30 and all .md => QUICK`,
        evidence: null,
      };
    } else {
      return {
        tier: "FULL",
        reason: `total lines ${totalLines} > ${MAX_TOTAL_LINES} and non-.md present`,
        evidence: null,
      };
    }
  }

  // Priority 4: extension .md only
  if (hasNonMd) {
    return {
      tier: "FULL",
      reason: `non-.md extension present: ${hasNonMd}`,
      evidence: null,
    };
  }

  // Priority 5: single file ≤5 lines raw/README body => SKIPPED, wiki => QUICK
  if (allFiles.length === 1 && totalLines <= 5) {
    const lone = allFiles[0];
    if (isWiki(lone)) {
      return {
        tier: "QUICK",
        reason: `single wiki file ${lone} ≤5 lines => QUICK (wiki 격상)`,
        evidence: null,
      };
    }
    if (isRaw(lone) || lone === "README.md") {
      // Need to ensure README is body not H1 — H1 already handled as FULL above, so body is safe
      // For raw/README body
      const evidence = buildEvidence(allFiles, totalLines, untracked, blacklistedHit, state);
      return {
        tier: "SKIPPED",
        reason: `single file ${lone} ≤5 lines raw/README body => SKIPPED`,
        evidence,
      };
    }
    // other single .md (e.g., index.md, other docs) — spec says only raw/README body is SKIPPED, others QUICK
    return {
      tier: "QUICK",
      reason: `single file ${lone} ≤5 lines but not raw/README body => QUICK`,
      evidence: null,
    };
  }

  // If single file >5 but ≤10 and .md and ≤2 files => QUICK
  // Also 2 files ≤10 lines .md => QUICK
  // Default for remaining that passed all gates: QUICK
  return {
    tier: "QUICK",
    reason: `passed fail-closed gates: ${allFiles.length} files, ${totalLines} lines, all .md => QUICK`,
    evidence: null,
  };
}

function buildEvidence(allFiles, totalLines, untracked, blacklisted, state) {
  let gitHead = "";
  try {
    const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", timeout: 3000 });
    if (r.status === 0) gitHead = String(r.stdout || "").trim();
  } catch {}
  return {
    files: allFiles,
    totalLines,
    untracked: [...untracked],
    blacklisted: blacklisted || null,
    timestamp: new Date().toISOString(),
    gitHead: gitHead || null,
    tracked: state.tracked || [],
  };
}

// ── CLI handling ──

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    check: false,
    dryRun: false,
    fixture: null,
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--check") opts.check = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--fixture") {
      const next = args[++i];
      if (!next) {
        console.error("missing value for --fixture");
        process.exit(2);
      }
      try {
        opts.fixture = JSON.parse(next);
      } catch (e) {
        console.error(`invalid --fixture JSON: ${e.message}`);
        process.exit(2);
      }
    } else if (a === "--help" || a === "-h") opts.help = true;
  }
  // default to --check if no flag
  if (!opts.check && !opts.dryRun && !opts.fixture && !opts.help) {
    opts.check = true;
  }
  return opts;
}

function printHelp() {
  console.log(`tiered-verify — Fail-Closed Tiered Verify (Phase 1)
Usage:
  node scripts/tiered-verify.js --check                 # git state -> tier, write .verify-tier.json if SKIPPED
  node scripts/tiered-verify.js --dry-run               # same but no sidecar
  node scripts/tiered-verify.js --fixture '<json>' --check # test seam

Fixture JSON: { files:[{file,added,deleted}], untracked:[file], diffContent:string }
Thresholds: max_files=${MAX_FILES}, max_total_lines=${MAX_TOTAL_LINES} (11-${MAX_QUICK_LINES} .md only => QUICK), allowed_ext=${ALLOWED_EXT}
Blacklist: ${BLACKLIST.join(", ")}
Exit: 0 SKIPPED with evidence, 1 QUICK/FULL, 2 invalid/tampered
`);
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  let state;
  if (opts.fixture) {
    // Fixture injection for tests
    const f = opts.fixture;
    // Support legacyFixture forms: { files:[{file,...}], untracked:[], diffContent, totalLines }
    // Also support { tracked:[...], untracked, diffContent } or { files:[...] }
    let tracked = [];
    if (Array.isArray(f.tracked)) tracked = f.tracked;
    else if (Array.isArray(f.files)) {
      // f.files may be array of strings or objects
      tracked = f.files.map((e) => {
        if (typeof e === "string") return { file: e, added: 1, deleted: 0 };
        return { file: e.file || e.path || String(e), added: e.added ?? 1, deleted: e.deleted ?? 0 };
      });
    }
    const untracked = Array.isArray(f.untracked) ? f.untracked : [];
    const diffContent = f.diffContent || f.diff || "";
    const totalLines =
      typeof f.totalLines === "number"
        ? f.totalLines
        : tracked.reduce((s, x) => s + (x.added || 0) + (x.deleted || 0), 0);
    const allFiles = [...tracked.map((t) => t.file), ...untracked];
    state = { tracked, untracked, diffContent, totalLines, allFiles };
  } else {
    state = getGitState();
  }

  const result = evaluateTier(state);
  const timestamp = new Date().toISOString();

  if (result.tier === "SKIPPED") {
    // Build full evidence payload
    const evidence = result.evidence || buildEvidence(state.allFiles || [], state.totalLines, state.untracked || [], null, state);
    const payload = {
      tier: result.tier,
      reason: result.reason,
      evidence,
      generated_at: timestamp,
    };
    const jsonLine = JSON.stringify(payload);
    // Validate evidence exists (fail-closed)
    if (!evidence || typeof evidence !== "object" || !Array.isArray(evidence.files)) {
      console.error(JSON.stringify({ error: "SKIPPED without valid evidence — blocked", tier: result.tier, reason: result.reason }));
      process.exit(2);
    }
    console.log(jsonLine);
    if (!opts.dryRun) {
      try {
        fs.writeFileSync(EVIDENCE_PATH, jsonLine + "\n", "utf8");
      } catch (e) {
        console.error(`failed to write sidecar ${EVIDENCE_PATH}: ${e.message}`);
        process.exit(2);
      }
    }
    process.exit(0);
  } else {
    // QUICK or FULL
    const payload = {
      tier: result.tier,
      reason: result.reason,
      evidence: null,
      files: state.allFiles || [],
      totalLines: state.totalLines,
      generated_at: timestamp,
    };
    console.log(JSON.stringify(payload));
    // Do not write sidecar for QUICK/FULL; but ensure stale sidecar is not misleading — leave it? Spec doesn't say to delete.
    // Exit 1 signals delegation needed
    process.exit(1);
  }
}

// ESM main guard
import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
