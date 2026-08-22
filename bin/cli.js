#!/usr/bin/env node
/**
 * palank-harness CLI — foundry installer (thin, 60 lines)
 * Usage:
 *   npx palank-harness init [dir]     # scaffold foundry to dir
 *   npx palank-harness migrate [dir]  # migrate existing project
 *   node bin/cli.js --help
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "..");

function help() {
  console.log(`palank-harness — thin foundry\nUsage:\n  palank-harness init [dir]     scaffold to dir (default .)\n  palank-harness migrate [dir]  migrate existing project\n  palank-harness --help`);
}

function cpRecursive(src, dest) {
  const st = fs.lstatSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) cpRecursive(path.join(src, e.name), path.join(dest, e.name));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function cmdInit(targetDir) {
  const target = path.resolve(targetDir || ".");
  fs.mkdirSync(target, { recursive: true });
  // P0-1 sync: ensure scripts/check_vault.js and eslint template are distributable
  const items = ["AGENTS.md", "opencode.json", "index.md", "log.md", "dynamicSubAgents.json", "eslint.config.template.mjs"];
  const dirs = ["wiki", "raw", "archive", "skills", "mcp", "plugins", "scripts", "templates"];
  for (const f of items) {
    const src = path.join(HARNESS_ROOT, f);
    if (fs.existsSync(src)) cpRecursive(src, path.join(target, f));
  }
  for (const d of dirs) {
    const src = path.join(HARNESS_ROOT, d);
    if (fs.existsSync(src)) cpRecursive(src, path.join(target, d));
  }
  console.log(`[palank-harness] init → ${target} — scaffold done`);
}

function cmdMigrate(targetDir, extraArgs) {
  const target = path.resolve(targetDir || ".");
  const script = path.join(HARNESS_ROOT, "scripts", "migrate.js");
  const args = [script, target, ...extraArgs];
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  process.exit(r.status ?? 0);
}

const [cmd, arg, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help" || cmd === "-h") help();
else if (cmd === "init") cmdInit(arg);
else if (cmd === "migrate") cmdMigrate(arg, rest);
else { console.error(`unknown command: ${cmd}`); help(); process.exit(1); }
