#!/usr/bin/env node
/**
 * sync-version.js — version SSOT propagator (2026-08-26 repair round)
 *
 * Master = ROOT package.json "version". Every live release token elsewhere
 * must equal what this file derives from the master:
 *   - full semver      -> mcp manifests (+ lockfile)
 *   - short "vX.Y"     -> AGENTS.md H1, README.md H1, package.json description
 *
 * TARGETS is an EXPLICIT allow-list. Things deliberately NOT synced:
 *   - log.md            — append-only audit ledger; history entries are immutable
 *   - wiki/, raw/, index.md — prose mentions like "v3.1 신설" are provenance labels
 *   - code comments & skills/**— historical annotations
 *   - AGENTS.md section headers — "(v3.1 ...)" marks when a section was added
 *   - mcp/server.js fallback constant — dead-code default, root read always succeeds
 *
 * Usage:
 *   node scripts/sync-version.js                      # apply fixes at repo root
 *   node scripts/sync-version.js --check              # report only; exit 1 on drift
 *   node scripts/sync-version.js [--check] --root DIR # operate on a fixture root (test seam)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let check = false;
  let root = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") check = true;
    else if (argv[i] === "--root") root = argv[++i];
    else if (argv[i] === "-h" || argv[i] === "--help") {
      console.log("usage: node scripts/sync-version.js [--check] [--root DIR]");
      process.exit(0);
    }
  }
  return { check, root: root ? path.resolve(root) : path.resolve(__dirname, "..") };
}

function readMasterVersion(root) {
  const pkg = JSON.parse(stripBom(fs.readFileSync(path.join(root, "package.json"), "utf-8")));
  if (!pkg.version || !/^\d+\.\d+\.\d+/.test(String(pkg.version))) {
    throw new Error(`master package.json lacks valid semver version: ${JSON.stringify(pkg.version)}`);
  }
  return String(pkg.version);
}

const shortToken = (version) => `v${version.split(".").slice(0, 2).join(".")}`;

/** Tolerate UTF-8 BOM — PowerShell 5.1 `Set-Content -Encoding utf8` emits one by default. */
const stripBom = (text) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/** Read a UTF-8 file; returns null when missing. */
function readText(root, rel) {
  try {
    return stripBom(fs.readFileSync(path.join(root, rel), "utf-8"));
  } catch {
    return null;
  }
}

function writeText(root, rel, content) {
  fs.writeFileSync(path.join(root, rel), content);
}

/**
 * Evaluate one target against the master version.
 * Returns { file, status: "ok"|"drift"|"error", detail, fix?: () => void }.
 */
function makeTargets(root, version, short) {
  const out = [];

  // 1) mcp/package.json — full semver
  out.push({
    file: "mcp/package.json",
    evaluate() {
      const rel = "mcp/package.json";
      const raw = readText(root, rel);
      if (raw === null) return { file: rel, status: "error", detail: "file missing" };
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        return { file: rel, status: "error", detail: `unparseable JSON (${e.message})` };
      }
      if (obj.version === version) {
        return { file: rel, status: "ok", detail: `version=${obj.version}` };
      }
      return {
        file: rel,
        status: "drift",
        detail: `version ${obj.version} -> ${version}`,
        fix() {
          obj.version = version;
          writeText(root, rel, JSON.stringify(obj, null, 2) + "\n");
        },
      };
    },
  });

  // 2) mcp/package-lock.json — root + packages[""] both carry the version
  out.push({
    file: "mcp/package-lock.json",
    evaluate() {
      const rel = "mcp/package-lock.json";
      const raw = readText(root, rel);
      if (raw === null) return { file: rel, status: "error", detail: "file missing" };
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        return { file: rel, status: "error", detail: `unparseable JSON (${e.message})` };
      }
      const spots = [
        ["root .version", obj.version],
        ['packages[""].version', obj.packages?.[""]?.version],
      ];
      const bad = spots.filter(([, v]) => v !== version);
      if (bad.length === 0) return { file: rel, status: "ok", detail: "both version fields match" };
      return {
        file: rel,
        status: "drift",
        detail: bad.map(([k, v]) => `${k}=${v}`).join(", ") + ` -> ${version}`,
        fix() {
          obj.version = version;
          if (obj.packages?.[""]) obj.packages[""].version = version;
          writeText(root, rel, JSON.stringify(obj, null, 2) + "\n");
        },
      };
    },
  });

  // 3..5) short-token headers/description — single regex each, fail-closed on missing pattern
  const tokenTargets = [
    { rel: "AGENTS.md", re: /^(# AGENTS\.md — palank-harness )v\d+\.\d+\b/m, label: "H1 token" },
    { rel: "README.md", re: /^(# palank-harness )v\d+\.\d+\b/m, label: "H1 token" },
    {
      rel: "package.json",
      re: /("description"\s*:\s*"[^"]*?palank-harness )v\d+\.\d+/,
      label: "description token",
    },
  ];
  for (const t of tokenTargets) {
    out.push({
      file: t.rel,
      evaluate() {
        const raw = readText(root, t.rel);
        if (raw === null) return { file: t.rel, status: "error", detail: "file missing" };
        const m = t.re.exec(raw);
        if (!m) {
          return { file: t.rel, status: "error", detail: `${t.label} pattern not found (fail-closed)` };
        }
        const current = m[0].slice(m[1].length);
        if (current === short) {
          return { file: t.rel, status: "ok", detail: `${t.label}=${current}` };
        }
        return {
          file: t.rel,
          status: "drift",
          detail: `${t.label} ${current} -> ${short}`,
          fix() {
            writeText(
              root,
              t.rel,
              raw.replace(t.re, (whole, prefix) => prefix + short)
            );
          },
        };
      },
    });
  }

  return out;
}

export function syncCheck(root) {
  const version = readMasterVersion(root);
  const short = shortToken(version);
  const results = makeTargets(root, version, short).map((t) => t.evaluate());
  return { version, short, results };
}

export function syncApply(root) {
  const version = readMasterVersion(root);
  const short = shortToken(version);
  const targets = makeTargets(root, version, short);
  const results = [];
  for (const t of targets) {
    const r = t.evaluate();
    if ((r.status === "drift" || r.status === "error") && typeof r.fix === "function") {
      r.fix();
      const after = t.evaluate(); // re-evaluate post-fix
      results.push(after.status === "ok" ? { ...after, detail: `fixed: ${r.detail}` } : after);
    } else {
      results.push(r);
    }
  }
  return { version, short, results };
}

function main() {
  const { check, root } = parseArgs(process.argv.slice(2));
  let outcome;
  try {
    outcome = check ? syncCheck(root) : syncApply(root);
  } catch (e) {
    console.error(`sync-version: FATAL ${e.message}`);
    process.exit(2);
  }

  let drifts = 0;
  let errors = 0;
  console.log(`sync-version: master package.json=${outcome.version} (token ${outcome.short})`);
  for (const r of outcome.results) {
    const mark = r.status === "ok" ? "OK   " : r.status === "drift" ? "DRIFT" : "ERROR";
    if (r.status !== "ok") {
      if (r.status === "drift") drifts++;
      else errors++;
    }
    console.log(`  [${mark}] ${r.file} — ${r.detail}`);
  }
  const bad = drifts + errors;
  console.log(`sync-version: ${outcome.results.length} targets, ${drifts} drift, ${errors} error`);

  if (!check && errors > 0) process.exit(2); // unfixable during apply
  if (check && bad > 0) process.exit(1); // drift detected under --check
  process.exit(0);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
