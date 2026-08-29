#!/usr/bin/env node
// ⚠️ thin v3.2 — harness-bootstrap / opencode init 금지 — AGENTS.md 금지 절 참조. thin 설치는 cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ 파일 복사만으로 수행, npx harness-bootstrap / opencode init / .opencode/agent/*.md 수동 생성 절대 금지. 오염 시 python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"
// WSL: Linux 절대경로(/home/jayeo/projects/...)만 쓰기 허용, UNC(\\wsl.localhost, \\wsl$) 쓰기 금지 — strict 시 FAIL
/**
 * check_vault.js — harness-native mechanical vault verification (v3)
 * Pure Node stdlib, ESM. Checks:
 *   a) index parity  — wiki md file count (recursive) == index.md bullets
 *   b) raw citation  — EVERY wiki page requires "> Raw:" resolving into raw/
 *   c) hash reachability — "Vault-Base: git:<hash>" resolvable when vault is a git repo
 *   d) markdown links — [text](path) targets must exist on vault surfaces
 *     (index.md + wiki/**); scheme links (http/https/mailto...) and pure anchors (#)
 *     are skipped; relative targets resolve against the vault ROOT by harness
 *     convention (index.md bullets are root-relative).
 *   e) forbidden pollution — .opencode/agent/*.md or .opencode/skills must not exist
 * Empty vault (0 pages, 0 rows) is a valid PASS skeleton.
 * Usage: node scripts/check_vault.js [--strict] [vaultDir=.]
 *
 * v3 port of _archive/scripts/check_vault.js @ git:b14f1bb — archive paths removed,
 * "> Raw:" now mandatory, drift check skipped outside a git repo (hermetic tests).
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const vaultArg = args.find((a) => !a.startsWith("-")) || ".";
const vaultDir = path.resolve(vaultArg);

let errors = 0;
const reports = [];
function report(level, msg) {
  reports.push(`${level}: ${msg}`);
  if (level === "error") errors++;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

// a) index.md parity: wiki/**/*.md vs index.md bullets
const wikiDir = path.join(vaultDir, "wiki");
const wikiFiles = walk(wikiDir).filter((f) => f.endsWith(".md") && path.basename(f) !== ".gitkeep");
const indexPath = path.join(vaultDir, "index.md");
let indexBullets = 0;
if (fs.existsSync(indexPath)) {
  let inSection = false;
  for (const line of fs.readFileSync(indexPath, "utf-8").split("\n")) {
    if (line.startsWith("## ")) inSection = true;
    if (inSection && line.startsWith("- ")) {
      if (line.includes("(no pages yet)")) continue;
      indexBullets++;
    }
  }
} else {
  report("error", "index.md missing");
}

// skeleton is not error — wiki 0 && index 0 -> PASS (empty vault is valid initial state)
if (wikiFiles.length === 0 && indexBullets === 0) {
  reports.push("info: skeleton vault — 0 pages, 0 index rows (parity ok)");
} else if (wikiFiles.length !== indexBullets) {
  report("error", `index parity mismatch: wiki files=${wikiFiles.length} vs index bullets=${indexBullets}`);
} else {
  reports.push(`info: index parity ok (${wikiFiles.length} pages)`);
}

// b) raw citation check — MANDATORY in v3: every page needs "> Raw:" into raw/
if (wikiFiles.length === 0) {
  reports.push("info: raw citation check skipped (no pages yet)");
} else {
  let citeErrors = 0;
  for (const f of wikiFiles) {
    const rel = path.relative(vaultDir, f);
    const content = fs.readFileSync(f, "utf-8");
    const cites = [...content.matchAll(/>\s*Raw:\s*`?([^`\s\n]+)`?/g)];
    if (cites.length === 0) {
      report("error", `${rel}: missing required '> Raw:' citation`);
      citeErrors++;
      continue;
    }
    for (const c of cites) {
      const ref = c[1].replace(/[,;\]\)]+$/, "");
      if (!ref.startsWith("raw/")) {
        report("error", `${rel}: Raw citation must point into raw/ -> ${ref}`);
        citeErrors++;
      } else if (!fs.existsSync(path.join(vaultDir, ref))) {
        report("error", `${rel}: raw target not found -> ${ref}`);
        citeErrors++;
      }
    }
  }
  if (citeErrors === 0) reports.push("info: raw citation check ok");
}

// c) Vault-Base hash reachability — only meaningful inside a git repo
if (!fs.existsSync(path.join(vaultDir, ".git"))) {
  reports.push("info: hash reachability check skipped (not a git repo)");
} else {
  const baseRe = /Vault-Base:\s*git:([a-f0-9]{7,40})/g;
  let baseFound = false;
  for (const f of [indexPath, ...wikiFiles].filter((p) => fs.existsSync(p))) {
    const content = fs.readFileSync(f, "utf-8");
    let m;
    while ((m = baseRe.exec(content)) !== null) {
      baseFound = true;
      const res = spawnSync("git", ["cat-file", "-e", m[1]], { cwd: vaultDir, stdio: "ignore" });
      if (res.status !== 0) {
        report("error", `hash unreachable: ${m[1]} in ${path.relative(vaultDir, f)}`);
      } else {
        reports.push(`info: hash reachable: ${m[1]}`);
      }
    }
  }
  if (!baseFound) reports.push("info: hash reachability check skipped (no Vault-Base)");
}

// d) markdown link target existence — [text](path) on index.md + wiki pages.
//    Skips scheme links (http/https/mailto/...) and anchors (#...); relative
//    targets resolve against the vault ROOT (harness convention, not file-relative).
{
  const linkRe = /\[[^\]\n]*\]\(([^()\s]+)\)/g;
  let linksChecked = 0;
  for (const f of [indexPath, ...wikiFiles].filter((p) => fs.existsSync(p))) {
    const rel = path.relative(vaultDir, f);
    const content = fs.readFileSync(f, "utf-8");
    for (const m of content.matchAll(linkRe)) {
      const target = m[1];
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) continue; // scheme: http://, https://, mailto:, ...
      if (target.startsWith("#")) continue; // pure in-page anchor
      const clean = target.split("#")[0];
      if (!clean) continue; // anchor-only variant after split
      linksChecked++;
      if (!fs.existsSync(path.resolve(vaultDir, clean))) {
        report("error", `${rel}: markdown link target not found -> ${target}`);
      }
    }
  }
  if (linksChecked === 0) reports.push("info: markdown link check skipped (no relative links)");
  else reports.push(`info: markdown link check ran (${linksChecked} relative links)`);
}

// e) forbidden .opencode agent pollution — thin harness는 3 agents만 허용 (pit of success)
{
  const agentDir = path.join(vaultDir, ".opencode", "agent");
  if (fs.existsSync(agentDir)) {
    for (const e of fs.readdirSync(agentDir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith(".md")) {
        report(
          "error",
          `forbidden .opencode/agent/${e.name} detected — thin harness는 3 agents(conductor/interpreter/verify)만 사용; harness/reviewer/researcher 잔재는 전역 harness-bootstrap 오염 — AGENTS.md 금지 절 참조, 삭제: python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"`
        );
      }
    }
  }
  // .opencode/skills 하위도 금지 (프로젝트 skills/는 허용, .opencode/skills는 오염)
  const skillsPollution = path.join(vaultDir, ".opencode", "skills");
  if (fs.existsSync(skillsPollution)) {
    const polluted = walk(skillsPollution).filter((f) => f.endsWith(".md"));
    if (polluted.length > 0) {
      report(
        "error",
        `forbidden .opencode/skills pollution detected (${polluted.length} files) — 프로젝트 skills/만 사용, .opencode/skills는 삭제`
      );
    }
  }
}

// f) WSL UNC path guard — Linux 절대경로만 허용, UNC(\\wsl.localhost, \\wsl$) strict FAIL
{
  const UNC_RE = /^\\\\wsl/i;
  const hasUNC = (s) =>
    typeof s === "string" && (UNC_RE.test(s) || s.includes("\\\\wsl.localhost") || s.includes("\\\\wsl$"));
  let uncDetected = false;
  let uncHint = "";
  // path argument & resolved dir
  if (hasUNC(vaultArg)) {
    uncDetected = true;
    uncHint = `vaultArg=${vaultArg}`;
  } else if (hasUNC(vaultDir)) {
    uncDetected = true;
    uncHint = `vaultDir=${vaultDir}`;
  } else if (hasUNC(process.argv.join(" "))) {
    uncDetected = true;
    uncHint = `argv=${process.argv.join(" ")}`;
  }
  // opencode.json content (if vault contains it)
  if (!uncDetected) {
    try {
      const ocPath = path.join(vaultDir, "opencode.json");
      if (fs.existsSync(ocPath)) {
        const raw = fs.readFileSync(ocPath, "utf-8");
        if (hasUNC(raw)) {
          uncDetected = true;
          uncHint = `opencode.json contains UNC`;
        }
      }
    } catch {}
  }
  // inventory cache path content (if exists, guard its content too)
  if (!uncDetected) {
    try {
      const invPath = path.join(vaultDir, ".opencode-inventory.json");
      if (fs.existsSync(invPath)) {
        const rawInv = fs.readFileSync(invPath, "utf-8");
        if (hasUNC(rawInv)) {
          uncDetected = true;
          uncHint = `.opencode-inventory.json contains UNC`;
        }
      }
    } catch {}
  }
  if (uncDetected) {
    report(
      "error",
      `FAIL: WSL UNC path forbidden — use ~/projects/<repo> Linux absolute (/home/jayeo/projects/...) (${uncHint})`
    );
  } else {
    reports.push("info: WSL UNC guard ok (no \\\\wsl path detected)");
  }
}

// summary
reports.push(
  `check_vault: ${errors} errors — ${wikiFiles.length} wiki files, ${indexBullets} index rows${strict ? " [strict]" : ""}`
);
for (const r of reports) console.log(r);

if (strict && errors > 0) process.exit(1);
