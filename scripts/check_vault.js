#!/usr/bin/env node
/**
 * check_vault.js — harness-native mechanical verification (brand 0)
 * Replaces check_evidence.py — pure Node, ESM, no python.
 * 3 checks: index parity / raw citation / drift
 * Usage: node scripts/check_vault.js [--strict] [vaultDir=.]
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const vaultArg = args.find(a => !a.startsWith("-")) || ".";
const vaultDir = path.resolve(vaultArg);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

let errors = 0, suspects = 0, unreferenced = 0;
const reports = [];

function report(level, msg) {
  reports.push(`${level}: ${msg}`);
  if (level === "error") errors++;
  if (level === "suspect") suspects++;
  if (level === "unreferenced") unreferenced++;
}

// a) index.md parity: wiki/**/*.md vs index.md bullets
const wikiDir = path.join(vaultDir, "wiki");
const wikiFiles = walk(wikiDir).filter(f => f.endsWith(".md") && path.basename(f) !== ".gitkeep");
const indexPath = path.join(vaultDir, "index.md");
let indexBullets = 0;
let indexContent = "";
if (fs.existsSync(indexPath)) {
  indexContent = fs.readFileSync(indexPath, "utf-8");
  const lines = indexContent.split("\n");
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith("## ")) inSection = true;
    if (inSection && line.startsWith("- ")) {
      if (line.includes("(no pages yet)")) continue;
      indexBullets++;
    }
  }
} else {
  report("error", "index.md missing");
}

if (wikiFiles.length === 0 && indexBullets === 0) {
  reports.push("info: skeleton vault — 0 pages, 0 index rows (parity ok)");
} else if (wikiFiles.length !== indexBullets) {
  report("error", `index parity mismatch: wiki files=${wikiFiles.length} vs index bullets=${indexBullets}`);
} else {
  reports.push(`info: index parity ok (${wikiFiles.length} pages)`);
}

// b) Raw citation check: each wiki file with "> Raw:" or "> Source:" must have raw/ target
if (wikiFiles.length === 0) {
  reports.push("info: raw citation check skipped (no pages yet)");
} else {
  for (const f of wikiFiles) {
    const content = fs.readFileSync(f, "utf-8");
    if (content.includes("> Raw:") || content.includes("> Source:")) {
      const matches = [...content.matchAll(/>\s*(Raw|Source):\s*`?([^`\s\n]+)`?/g)];
      for (const m of matches) {
        const rawRef = m[2].replace(/[,;\]\)]+$/, "");
        const rawPath = path.join(vaultDir, rawRef);
        // normalize raw/ prefix check
        if (rawRef.startsWith("raw/")) {
          if (!fs.existsSync(rawPath)) {
            report("error", `raw citation missing: ${path.relative(vaultDir, f)} → ${rawRef} not found`);
          }
        }
      }
    }
  }
  if (errors === 0) reports.push("info: raw citation check ok");
}

// c) Drift check: Vault-Base: git:<hash>
const allCheckFiles = [indexPath, ...wikiFiles].filter(p => fs.existsSync(p));
const driftRe = /Vault-Base:\s*git:([a-f0-9]{7,40})/g;
let driftFound = false;
for (const f of allCheckFiles) {
  const content = fs.readFileSync(f, "utf-8");
  let m;
  while ((m = driftRe.exec(content)) !== null) {
    driftFound = true;
    const hash = m[1];
    const res = spawnSync("git", ["cat-file", "-e", hash], { stdio: "ignore" });
    if (res.status !== 0) {
      report("error", `drift hash unreachable: ${hash} in ${path.relative(vaultDir, f)} (fetch-depth:0 필요)`);
    } else {
      reports.push(`info: drift hash ok: ${hash}`);
    }
  }
}
if (!driftFound) reports.push("info: drift check skipped (no Vault-Base)");

// summary
const summary = `check_vault: ${errors} errors, ${suspects} suspects, ${unreferenced} unreferenced — ${wikiFiles.length} wiki files, ${indexBullets} index rows`;
reports.push(summary);
for (const r of reports) console.log(r);

if (strict && (errors > 0 || suspects > 0)) process.exit(1);
if (errors > 0 && strict) process.exit(1);
