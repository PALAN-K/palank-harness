#!/usr/bin/env node
// verify-tiered.js — tier-aware verify dispatcher (fix #3)
// Runs tiered --check ONCE (single history append for real checks),
// then delegates by tier: SKIPPED→exit 0, QUICK→verify:quick, FULL→verify.
// Fail-closed: tampered (exit 2) blocks, unparsable tier → full verify.
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SHELL = process.platform === "win32";

function runNpm(args) {
  return SHELL
    ? spawnSync(["npm", ...args].join(" "), { cwd: ROOT, encoding: "utf8", stdio: "inherit", shell: true })
    : spawnSync("npm", args, { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
}

function runTiered() {
  const r = SHELL
    ? spawnSync("node scripts/tiered-verify.js --check", { cwd: ROOT, encoding: "utf8", shell: true })
    : spawnSync("node", ["scripts/tiered-verify.js", "--check"], { cwd: ROOT, encoding: "utf8" });
  const lines = String(r.stdout || "").trim().split("\n");
  const last = lines[lines.length - 1] || "";
  let tier = null;
  try {
    tier = JSON.parse(last).tier || null;
  } catch {
    tier = null;
  }
  return { status: r.status, tier, stdout: String(r.stdout || ""), stderr: String(r.stderr || "") };
}

const t = runTiered();
if (t.stdout) console.log(t.stdout.trim());
if (t.status === 2) {
  if (t.stderr) console.error(t.stderr.trim());
  console.error("tiered evidence tampered — blocked");
  process.exit(2);
}
if (t.status === 0) process.exit(0); // SKIPPED with evidence
if (t.tier === "QUICK") {
  const q = runNpm(["run", "verify:quick"]);
  process.exit(q.status ?? 1);
}
// FULL or unparsable → fail-closed full verify
const f = runNpm(["run", "verify"]);
process.exit(f.status ?? 1);
