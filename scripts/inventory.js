#!/usr/bin/env node
// ⚠️ thin v3.2 — harness-bootstrap / opencode init 금지 — AGENTS.md 금지 절 참조. thin 설치는 cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ 파일 복사만으로 수행, npx harness-bootstrap / opencode init / .opencode/agent/*.md 수동 생성 절대 금지. 오염 시 python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"
// WSL: Linux 절대경로(/home/jayeo/projects/...)만 쓰기 허용, UNC(\\wsl.localhost, \\wsl$) 쓰기 금지 — strict 시 FAIL
/**
 * inventory.js — startup inventory as executable code (v3).
 * Replaces the v2 prose spec (_archive/scripts/optional/interpreter-wrapper.md @ b14f1bb).
 * Every run discovers the LIVE opencode agents/tools; static mapping tables are forbidden.
 * Cache: .opencode-inventory.json (24h validity).
 * CLI: node scripts/inventory.js [--refresh] [--strict]   (npm run inventory = --refresh)
 * Pure Node stdlib. Discovery is best-effort — parse failures are tolerated.
 * --strict: forbidden .opencode/agent 오염이 감지되면 exit 1 (check_vault와 동일한 pit-of-success 게이트).
 */
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_PATH = path.join(ROOT, ".opencode-inventory.json");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SHELL = process.platform === "win32";

// spawnSync wrapper — on Windows the CLI is opencode.cmd, which needs shell:true;
// args are fixed internal literals (no spaces), so string joining avoids DEP0190.
function run(cmd, args, timeoutMs) {
  return SHELL
    ? spawnSync([cmd, ...args].join(" "), { encoding: "utf8", timeout: timeoutMs, shell: true })
    : spawnSync(cmd, args, { encoding: "utf8", timeout: timeoutMs });
}

function tryJson(cmd, args, timeoutMs = 15000) {
  try {
    const r = run(cmd, args, timeoutMs);
    if (r.status !== 0 || !r.stdout) return null;
    return JSON.parse(r.stdout);
  } catch {
    return null; // best-effort: parse failures tolerated
  }
}

function opencodeVersion() {
  try {
    const r = run("opencode", ["--version"], 10000);
    return r.status === 0 ? String(r.stdout || "").trim() : null;
  } catch {
    return null; // CLI not installed / not resolvable
  }
}

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function skillName(mdPath) {
  try {
    const m = fs.readFileSync(mdPath, "utf8").slice(0, 600).match(/^name:\s*(.+)$/m);
    return m ? m[1].trim() : path.basename(path.dirname(mdPath));
  } catch {
    return path.basename(path.dirname(mdPath));
  }
}

// normalize object-map or array into [{ name, ...def }]
function normMap(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object");
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => ({ name: k, ...(v && typeof v === "object" ? v : {}) }));
  }
  return [];
}

function collect(version) {
  const source = [];
  const agents = new Map(); // name -> {name, ...}
  const tools = new Map(); // invocation -> {name, description, source, invocation}

  // 1) opencode debug skill — built-in/project/global skills
  const skillsRaw = tryJson("opencode", ["debug", "skill"]);
  if (skillsRaw) {
    source.push("opencode debug skill");
    for (const s of normMap(skillsRaw.skills || skillsRaw)) {
      if (!s.name) continue;
      tools.set(`skill:${s.name}`, {
        name: s.name,
        description: s.description || "",
        source: "opencode debug skill",
        invocation: `skill:${s.name}`,
      });
    }
  }

  // 2) opencode debug config — resolved agents/mcp/plugins
  const configRaw = tryJson("opencode", ["debug", "config"]);
  if (configRaw) {
    source.push("opencode debug config");
    for (const a of normMap(configRaw.agent)) {
      if (!a.name) continue;
      agents.set(a.name, { name: a.name, mode: a.mode || "", source: "opencode debug config" });
    }
    for (const m of normMap(configRaw.mcp)) {
      if (!m.name) continue;
      tools.set(`mcp:${m.name}`, {
        name: m.name,
        description: "MCP server (domain tools)",
        source: "opencode debug config",
        invocation: `mcp:${m.name}`,
      });
    }
  }

  // 3) filesystem globs — project + global command/agent/skill dirs (wrapper spec)
  const home = os.homedir();
  const globRoots = [
    path.join(ROOT, ".opencode", "command"),
    path.join(home, ".config", "opencode", "command"),
    path.join(ROOT, ".opencode", "agent"),
    path.join(home, ".config", "opencode", "agent"),
    path.join(ROOT, "skills"),
    path.join(ROOT, ".opencode", "skills"),
    path.join(home, ".config", "opencode", "skills"),
  ];
  const seen = new Set();
  for (const dir of globRoots) {
    for (const f of walkMd(dir)) {
      if (seen.has(f)) continue;
      seen.add(f);
      const norm = f.replace(/\\/g, "/");
      if (/\/command\/[^/]+\.md$/.test(norm)) {
        const name = "/" + path.basename(f, ".md");
        tools.set(name, { name, description: "", source: "filesystem glob (slash command)", invocation: name });
      } else if (/\/agent\/[^/]+\.md$/.test(norm)) {
        const name = path.basename(f, ".md");
        agents.set(name, { name, mode: "", source: "filesystem glob (agent/*.md)" });
      } else if (/SKILL\.md$/.test(norm)) {
        const name = skillName(f);
        tools.set(`skill:${name}`, { name, description: "", source: "filesystem glob (SKILL.md)", invocation: `skill:${name}` });
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    available: true,
    version: version || null,
    agents: [...agents.values()],
    tools: [...tools.values()],
    source: (source.length ? source.join("; ") + "; " : "") + "filesystem glob",
  };
}

function unavailable() {
  return {
    generated_at: new Date().toISOString(),
    available: false,
    note: "opencode CLI not found",
  };
}

function emit(inv) {
  // f) WSL UNC guard — Linux 절대경로만 허용, UNC strict FAIL
  {
    const UNC_RE = /^\\\\wsl/i;
    const hasUNC = (s) =>
      typeof s === "string" && (UNC_RE.test(s) || s.includes("\\\\wsl.localhost") || s.includes("\\\\wsl$"));
    const argvJoined = process.argv.join(" ");
    const invStr = JSON.stringify(inv);
    let uncHint = "";
    if (hasUNC(ROOT)) uncHint = `ROOT=${ROOT}`;
    else if (hasUNC(CACHE_PATH)) uncHint = `CACHE_PATH=${CACHE_PATH}`;
    else if (hasUNC(argvJoined)) uncHint = `argv=${argvJoined.slice(0, 120)}`;
    else if (hasUNC(invStr)) uncHint = `inventory contains UNC`;
    if (uncHint) {
      console.error(
        `FAIL: WSL UNC path forbidden — use ~/projects/<repo> Linux absolute (/home/jayeo/projects/...) (${uncHint})`
      );
      if (process.argv.includes("--strict")) process.exit(1);
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(inv, null, 2));
  console.log(JSON.stringify(inv, null, 2));
  // e) fail-closed 오염 경고 — thin 3 agents 외 forbidden이 filesystem glob으로 유입되면 경고
  const FORBIDDEN = new Set(["harness", "reviewer", "researcher", "build", "plan"]);
  const ALLOWED = new Set(["conductor", "interpreter", "verify"]);
  const polluted = (inv.agents || []).filter(
    (a) => FORBIDDEN.has(a.name) && String(a.source || "").includes("filesystem glob")
  );
  if (polluted.length > 0) {
    const names = polluted.map((a) => a.name).join(", ");
    console.error(
      `WARNING: forbidden .opencode/agent detected [${names}] — thin harness는 3 agents(conductor/interpreter/verify)만 사용합니다. 전역 harness-bootstrap 오염으로 추정: python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))" 로 정리 후 npm run inventory --refresh (AGENTS.md 금지 절 참조).`
    );
    if (process.argv.includes("--strict")) process.exit(1);
  }
  // .opencode/agent 자체가 존재하면 경고 (agents에 안 잡혀도)
  try {
    const legacyAgentDir = path.join(ROOT, ".opencode", "agent");
    if (fs.existsSync(legacyAgentDir)) {
      const leftover = fs.readdirSync(legacyAgentDir).filter((f) => f.endsWith(".md"));
      if (leftover.length > 0 && polluted.length === 0) {
        console.error(
          `WARNING: .opencode/agent/*.md still exists [${leftover.join(", ")}] — inventory에서는 미집계이나 vault 린터가 FAIL 처리합니다. 삭제 요망.`
        );
      }
    }
  } catch {}
}

// --- main ---
// f) early WSL UNC guard — also covers cache-hit path (emit not called)
{
  const UNC_RE = /^\\\\wsl/i;
  const hasUNC = (s) =>
    typeof s === "string" && (UNC_RE.test(s) || s.includes("\\\\wsl.localhost") || s.includes("\\\\wsl$"));
  const argvJoined = process.argv.join(" ");
  let uncHint = "";
  if (hasUNC(ROOT)) uncHint = `ROOT=${ROOT}`;
  else if (hasUNC(CACHE_PATH)) uncHint = `CACHE_PATH=${CACHE_PATH}`;
  else if (hasUNC(argvJoined)) uncHint = `argv=${argvJoined.slice(0, 120)}`;
  if (uncHint) {
    console.error(
      `FAIL: WSL UNC path forbidden — use ~/projects/<repo> Linux absolute (/home/jayeo/projects/...) (${uncHint})`
    );
    if (process.argv.includes("--strict")) process.exit(1);
  }
  // also scan cached inventory json if exists
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, "utf-8");
      if (hasUNC(raw)) {
        console.error(
          `FAIL: WSL UNC path forbidden — use ~/projects/<repo> Linux absolute (/home/jayeo/projects/...) (.opencode-inventory.json contains UNC)`
        );
        if (process.argv.includes("--strict")) process.exit(1);
      }
    }
  } catch {}
}
const refresh = process.argv.includes("--refresh");
if (!refresh && fs.existsSync(CACHE_PATH)) {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    if (cached.generated_at && Date.now() - Date.parse(cached.generated_at) < MAX_AGE_MS) {
      console.log(JSON.stringify(cached, null, 2)); // fresh cache hit
      process.exit(0);
    }
  } catch {
    /* stale/corrupt cache falls through to recollection */
  }
}
const version = opencodeVersion();
emit(version ? collect(version) : unavailable()); // graceful exit 0 either way
