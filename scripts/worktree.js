#!/usr/bin/env node
/**
 * Worktree isolation for overnight loops — thin harness P1
 * Each Task gets `git worktree add .worktrees/<task>` so parallel subagents don't clobber main.
 * Event log: append-only .worktrees/<task>/event-log.jsonl (replay-exact)
 * Usage:
 *   node scripts/worktree.js create <taskId>   # creates worktree
 *   node scripts/worktree.js remove <taskId>   # removes worktree
 *   node scripts/worktree.js list
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const WT_ROOT = path.join(ROOT, ".worktrees");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf-8", ...opts });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || `exit ${r.status}`);
  return r.stdout.trim();
}

export function create(taskId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) throw new Error("invalid taskId");
  fs.mkdirSync(WT_ROOT, { recursive: true });
  const wtPath = path.join(WT_ROOT, taskId);
  if (fs.existsSync(wtPath)) {
    console.log(`[worktree] already exists: ${wtPath}`);
    return wtPath;
  }
  // create worktree from HEAD
  run("git", ["worktree", "add", wtPath, "HEAD"], { cwd: ROOT });
  // init event log
  fs.writeFileSync(path.join(wtPath, "event-log.jsonl"), `{"event":"worktree.created","task":"${taskId}","at":"${new Date().toISOString()}"}\n`);
  console.log(`[worktree] created: ${wtPath}`);
  return wtPath;
}

export function remove(taskId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) throw new Error("invalid taskId");
  const wtPath = path.join(WT_ROOT, taskId);
  if (!fs.existsSync(wtPath)) {
    console.log(`[worktree] not found: ${wtPath}`);
    return;
  }
  run("git", ["worktree", "remove", wtPath, "--force"], { cwd: ROOT });
  console.log(`[worktree] removed: ${wtPath}`);
}

export function list() {
  if (!fs.existsSync(WT_ROOT)) { console.log("(no worktrees)"); return; }
  const dirs = fs.readdirSync(WT_ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  if (dirs.length === 0) console.log("(no worktrees)");
  else dirs.forEach(d => console.log(path.join(WT_ROOT, d)));
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "create" && arg) create(arg);
else if (cmd === "remove" && arg) remove(arg);
else if (cmd === "list" || !cmd) list();
else {
  console.error("Usage: node scripts/worktree.js <create|remove|list> [taskId]");
  process.exit(1);
}
