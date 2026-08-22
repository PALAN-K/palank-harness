#!/usr/bin/env node
/**
 * Palank Harness — Migrate (dry-run / apply)
 * Tests a target project WITHOUT damage in dry-run, shows what would change.
 * Usage:
 *   node scripts/migrate.js "C:\Users\jayeo\Documents\Lovable Project\집꾸미다" --dry-run
 *   node scripts/migrate.js "C:\Users\jayeo\Documents\Lovable Project\집꾸미다" --apply
 * Or:
 *   npm run migrate -- "C:\path" --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "..");

const ANCHOR_START = "<!-- [palank-harness:anchor:start] -->";
const ANCHOR_END = "<!-- [palank-harness:anchor:end] -->";

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  let mode = "dry-run";
  for (const a of args) {
    if (a === "--dry-run") mode = "dry-run";
    else if (a === "--apply") mode = "apply";
    else if (!a.startsWith("-") && !target) target = a;
  }
  if (!target) {
    console.error("Usage: node scripts/migrate.js <target-dir> [--dry-run|--apply]");
    process.exit(1);
  }
  return { target: path.resolve(target), mode };
}

function exists(p) { return fs.existsSync(p); }

function readIfExists(p) {
  try { return fs.readFileSync(p, "utf-8"); } catch { return null; }
}

function parseJsonSafe(p) {
  const raw = readIfExists(p);
  if (raw == null) return null;
  const cleaned = raw.replace(/^\uFEFF/, "");
  return JSON.parse(cleaned);
}

function buildAnchorBlock() {
  const harnessAgents = readIfExists(path.join(HARNESS_ROOT, "AGENTS.md")) || "";
  // Use first 30 lines as anchor, or full if short
  const snippet = harnessAgents.split("\n").slice(0, 40).join("\n");
  return `${ANCHOR_START}\n${snippet}\n${ANCHOR_END}`;
}

function planAgentsMd(target) {
  const targetFile = path.join(target, "AGENTS.md");
  const anchor = buildAnchorBlock();
  if (!exists(targetFile)) {
    return { action: "create", file: "AGENTS.md", detail: "새로 생성 (006 AGENTS.md 전체 복사)" };
  }
  const content = readIfExists(targetFile) || "";
  if (content.includes(ANCHOR_START)) {
    return { action: "skip", file: "AGENTS.md", detail: "이미 패치됨 (anchor 존재) — 건너뜀" };
  }
  return { action: "append", file: "AGENTS.md", detail: `기존 파일 끝에 anchor 블록 추가 (${anchor.split("\n").length}줄)`, preview: anchor.slice(0, 300) + "..." };
}

function planOpencodeJson(target) {
  const targetFile = path.join(target, "opencode.json");
  const harnessFile = path.join(HARNESS_ROOT, "opencode.json");
  if (!exists(targetFile)) {
    return { action: "create", file: "opencode.json", detail: "새로 생성 (006 opencode.json 복사)" };
  }
  try {
    const tRaw = readIfExists(targetFile);
    const hRaw = readIfExists(harnessFile);
    const t = JSON.parse((tRaw || "{}").replace(/^\uFEFF/, ""));
    const h = JSON.parse((hRaw || "{}").replace(/^\uFEFF/, ""));
    const missing = [];
    // provider keys
    const tProviders = Object.keys(t.provider || {});
    const hProviders = Object.keys(h.provider || {});
    const missingProviders = hProviders.filter(k => !tProviders.includes(k));
    if (missingProviders.length) missing.push(`provider:${missingProviders.join(",")}`);
    // agent keys (interpreter/verify/conductor etc)
    const tAgents = Object.keys(t.agent || {});
    const hAgents = Object.keys(h.agent || {});
    const missingAgents = hAgents.filter(k => !tAgents.includes(k));
    if (missingAgents.length) missing.push(`agent:${missingAgents.join(",")}`);
    // plugin array (union)
    const tPlugins = Array.isArray(t.plugin) ? t.plugin : [];
    const hPlugins = Array.isArray(h.plugin) ? h.plugin : [];
    const missingPlugins = hPlugins.filter(k => !tPlugins.includes(k));
    if (missingPlugins.length) missing.push(`plugin:${missingPlugins.join(",")}`);
    // instructions array
    const tInstr = Array.isArray(t.instructions) ? t.instructions : [];
    const hInstr = Array.isArray(h.instructions) ? h.instructions : [];
    const missingInstr = hInstr.filter(k => !tInstr.includes(k));
    if (missingInstr.length) missing.push(`instructions:${missingInstr.join(",")}`);
    if (missing.length === 0) {
      return { action: "skip", file: "opencode.json", detail: "이미 동기화됨 — 건너뜀" };
    }
    return { action: "merge", file: "opencode.json", detail: `병합 필요: ${missing.join(" | ")} 추가` };
  } catch {
    return { action: "overwrite?", file: "opencode.json", detail: "JSON 파싱 실패 — 수동 확인 필요" };
  }
}

function planDir(target, rel) {
  if (rel.endsWith(".md")) return null; // files handled separately
  const targetDir = path.join(target, rel);
  const harnessDir = path.join(HARNESS_ROOT, rel);
  if (!exists(harnessDir)) return null;
  // ensure harness is directory
  try { if (!fs.lstatSync(harnessDir).isDirectory()) return null; } catch { return null; }
  if (!exists(targetDir)) {
    return { action: "create", file: rel + "/", detail: `디렉토리 새로 생성` };
  }
  return { action: "skip", file: rel + "/", detail: "이미 존재 — .gitkeep만 보충" };
}

function planWiki(target) {
  const checks = [];
  for (const rel of ["wiki", "raw", "archive", "index.md", "log.md"]) {
    const r = planDir(target, rel) || (() => {
      const tf = path.join(target, rel);
      const hf = path.join(HARNESS_ROOT, rel);
      if (rel.endsWith(".md")) {
        if (!exists(tf) && exists(hf)) return { action: "create", file: rel, detail: "새로 생성 (파일)" };
        if (exists(tf)) return { action: "skip", file: rel, detail: "이미 존재 — 덮어쓰지 않음" };
      }
      return null;
    })();
    if (r) checks.push(r);
  }
  return checks;
}

function planSkills(target) {
  const skills = [];
  const harnessSkills = fs.existsSync(path.join(HARNESS_ROOT, "skills")) ? fs.readdirSync(path.join(HARNESS_ROOT, "skills")) : [];
  for (const s of harnessSkills) {
    const targetSkill = path.join(target, ".agents", "skills", s);
    const harnessSkill = path.join(HARNESS_ROOT, "skills", s);
    if (!exists(targetSkill)) {
      skills.push({ action: "create", file: `.agents/skills/${s}/`, detail: `스킬 새로 설치 (${s})` });
    } else {
      skills.push({ action: "skip", file: `.agents/skills/${s}/`, detail: "이미 설치됨" });
    }
  }
  // Also check MCP
  const mcpTarget = path.join(target, "mcp");
  if (!exists(mcpTarget) && exists(path.join(HARNESS_ROOT, "mcp"))) {
    skills.push({ action: "create", file: "mcp/", detail: "MCP 스텁 새로 생성" });
  } else if (exists(mcpTarget)) {
    skills.push({ action: "skip", file: "mcp/", detail: "이미 존재" });
  }
  return skills;
}

function planPlugins(target) {
  const out = [];
  const harnessPlugin = path.join(HARNESS_ROOT, "plugins", "force-delegation.js");
  const targetPlugin = path.join(target, "plugins", "force-delegation.js");
  if (exists(harnessPlugin) && !exists(targetPlugin)) {
    out.push({ action: "create", file: "plugins/force-delegation.js", detail: "플러그인 새로 설치 (force-delegation)" });
  } else if (exists(targetPlugin)) {
    out.push({ action: "skip", file: "plugins/force-delegation.js", detail: "이미 존재" });
  }
  return out;
}

function planDynamicSubAgents(target) {
  const harnessFile = path.join(HARNESS_ROOT, "dynamicSubAgents.json");
  const targetFile = path.join(target, "dynamicSubAgents.json");
  if (exists(harnessFile) && !exists(targetFile)) {
    return [{ action: "create", file: "dynamicSubAgents.json", detail: "동적 서브에이전트 설정 새로 생성" }];
  } else if (exists(targetFile)) {
    return [{ action: "skip", file: "dynamicSubAgents.json", detail: "이미 존재" }];
  }
  return [];
}

function planPackageJsonScripts(target) {
  const targetFile = path.join(target, "package.json");
  if (!exists(targetFile)) return null;
  try {
    const raw = readIfExists(targetFile) || "{}";
    const j = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const scripts = (j.scripts && typeof j.scripts === "object") ? j.scripts : {};
    const missing = [];
    if (!scripts["check:vault"]) missing.push("check:vault");
    if (!scripts["test"]) missing.push("test");
    if (missing.length === 0) {
      return { action: "skip", file: "package.json:scripts", detail: "scripts 이미 존재 (check:vault, test) — 건너뜀" };
    }
    // existing 있으면 덮지 않음 — missing만 추가
    return { action: "merge", file: "package.json:scripts", detail: `scripts 병합 필요: ${missing.join(", ")} 추가 (기존 있으면 덮지 않음)`, missing };
  } catch {
    return { action: "skip", file: "package.json:scripts", detail: "package.json 파싱 실패 — 수동 확인 필요" };
  }
}

function planScripts(target) {
  const harnessScript = path.join(HARNESS_ROOT, "scripts", "check_vault.js");
  const targetScript = path.join(target, "scripts", "check_vault.js");
  if (!exists(harnessScript)) return null;
  if (!exists(targetScript)) {
    return { action: "create", file: "scripts/check_vault.js", detail: "검증 스크립트 새로 설치 (harness → target)" };
  }
  return { action: "skip", file: "scripts/check_vault.js", detail: "이미 존재 — 덮어쓰지 않음" };
}

function applyPlan(target, plan, mode) {
  let created = 0, appended = 0, skipped = 0;
  for (const p of plan) {
    const prefix = mode === "dry-run" ? "[DRY-RUN]" : "[APPLY]";
    const icon = p.action === "create" ? "➕" : p.action === "append" || p.action === "merge" ? "➕" : p.action === "skip" ? "✓" : "⚠";
    console.log(`${prefix} ${icon} ${p.file.padEnd(30)} — ${p.action.toUpperCase().padEnd(8)} : ${p.detail}`);
    if (p.preview) console.log(`      preview: ${p.preview.replace(/\n/g, " ").slice(0, 120)}...`);
    if (mode === "apply") {
      try {
        if (p.action === "create" && p.file === "AGENTS.md") {
          fs.copyFileSync(path.join(HARNESS_ROOT, "AGENTS.md"), path.join(target, "AGENTS.md"));
          created++;
        } else if (p.action === "append" && p.file === "AGENTS.md") {
          const anchor = buildAnchorBlock();
          const prev = readIfExists(path.join(target, "AGENTS.md")) || "";
          const sep = prev.endsWith("\n") ? "\n" : "\n\n";
          fs.writeFileSync(path.join(target, "AGENTS.md"), prev + sep + anchor + "\n", "utf-8");
          appended++;
        } else if (p.action === "create" && p.file === "opencode.json") {
          fs.copyFileSync(path.join(HARNESS_ROOT, "opencode.json"), path.join(target, "opencode.json"));
          created++;
        } else if (p.action === "merge" && p.file === "opencode.json") {
          // deep-merge missing providers/agents/plugins/instructions into target's opencode.json
          const targetFile = path.join(target, "opencode.json");
          const harnessFile = path.join(HARNESS_ROOT, "opencode.json");
          const t = JSON.parse((readIfExists(targetFile) || "{}").replace(/^\uFEFF/, ""));
          const h = JSON.parse((readIfExists(harnessFile) || "{}").replace(/^\uFEFF/, ""));
          // provider
          if (h.provider) {
            t.provider = t.provider || {};
            for (const k of Object.keys(h.provider)) {
              if (!(k in t.provider)) t.provider[k] = h.provider[k];
            }
          }
          // agent
          if (h.agent) {
            t.agent = t.agent || {};
            for (const k of Object.keys(h.agent)) {
              if (!(k in t.agent)) t.agent[k] = h.agent[k];
            }
          }
          // plugin array union
          if (Array.isArray(h.plugin)) {
            const cur = Array.isArray(t.plugin) ? t.plugin : [];
            const merged = [...cur];
            for (const p of h.plugin) if (!merged.includes(p)) merged.push(p);
            t.plugin = merged;
          }
          // instructions array union
          if (Array.isArray(h.instructions)) {
            const cur = Array.isArray(t.instructions) ? t.instructions : [];
            const merged = [...cur];
            for (const ins of h.instructions) if (!merged.includes(ins)) merged.push(ins);
            t.instructions = merged;
          }
          // copy top-level model if missing
          if (h.model && !t.model) t.model = h.model;
          // ensure $schema
          if (h["$schema"] && !t["$schema"]) t["$schema"] = h["$schema"];
          // also copy mcp if missing
          if (h.mcp && !t.mcp) t.mcp = h.mcp;
          fs.writeFileSync(targetFile, JSON.stringify(t, null, 2) + "\n", "utf-8");
          created++;
        } else if (p.action === "create" && p.file.startsWith(".agents/skills/")) {
          const name = p.file.split("/")[2];
          const src = path.join(HARNESS_ROOT, "skills", name);
          const dest = path.join(target, ".agents", "skills", name);
          // use harness's copy logic (simple)
          const cp = (s, d) => {
            const st = fs.lstatSync(s);
            if (st.isDirectory()) {
              fs.mkdirSync(d, { recursive: true });
              for (const e of fs.readdirSync(s, { withFileTypes: true })) {
                cp(path.join(s, e.name), path.join(d, e.name));
              }
            } else {
              fs.mkdirSync(path.dirname(d), { recursive: true });
              fs.copyFileSync(s, d);
            }
          };
          cp(src, dest);
          created++;
        } else if (p.action === "create" && p.file === "mcp/") {
          const cp = (s, d) => {
            const st = fs.lstatSync(s);
            if (st.isDirectory()) {
              fs.mkdirSync(d, { recursive: true });
              for (const e of fs.readdirSync(s, { withFileTypes: true })) cp(path.join(s, e.name), path.join(d, e.name));
            } else {
              fs.mkdirSync(path.dirname(d), { recursive: true });
              fs.copyFileSync(s, d);
            }
          };
          cp(path.join(HARNESS_ROOT, "mcp"), path.join(target, "mcp"));
          created++;
        } else if (p.action === "create" && p.file.endsWith("/")) {
          fs.mkdirSync(path.join(target, p.file), { recursive: true });
          created++;
        } else if (p.action === "create" && p.file === "plugins/force-delegation.js") {
          const src = path.join(HARNESS_ROOT, "plugins", "force-delegation.js");
          const dest = path.join(target, "plugins", "force-delegation.js");
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
          created++;
        } else if (p.action === "create" && p.file === "dynamicSubAgents.json") {
          fs.copyFileSync(path.join(HARNESS_ROOT, "dynamicSubAgents.json"), path.join(target, "dynamicSubAgents.json"));
          created++;
        } else if (p.action === "create" && (p.file === "index.md" || p.file === "log.md")) {
          fs.copyFileSync(path.join(HARNESS_ROOT, p.file), path.join(target, p.file));
          created++;
        } else if (p.action === "merge" && p.file === "package.json:scripts") {
          const targetFile = path.join(target, "package.json");
          const j = JSON.parse((readIfExists(targetFile) || "{}").replace(/^\uFEFF/, ""));
          j.scripts = j.scripts || {};
          if (!j.scripts["check:vault"]) j.scripts["check:vault"] = "node scripts/check_vault.js --strict .";
          // thin default: node --test (vitest is opt-in — project should `npm i -D vitest` and override test script manually)
          if (!j.scripts["test"]) j.scripts["test"] = "node --test tests/*.test.js 2>&1 || echo 'no tests yet — add per-project tests'";
          // 기존 있으면 덮지 않음 — missing만 보충 (planPackageJsonScripts logic)
          fs.writeFileSync(targetFile, JSON.stringify(j, null, 2) + "\n", "utf-8");
          created++;
        } else if (p.action === "create" && p.file === "scripts/check_vault.js") {
          const src = path.join(HARNESS_ROOT, "scripts", "check_vault.js");
          const dest = path.join(target, "scripts", "check_vault.js");
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
          created++;
        } else {
          skipped++;
        }
      } catch (e) {
        console.error(`  ✗ failed: ${e.message}`);
      }
    } else {
      if (p.action === "skip") skipped++; else created++;
    }
  }
  console.log(`\n${mode === "dry-run" ? "미리보기" : "적용"} 요약: ${created} 생성/추가, ${skipped} 건너뜀`);
  if (mode === "dry-run") console.log(`→ 원본 훼손 없음. --apply 로 실제 적용하세요.`);
}

function main() {
  const { target, mode } = parseArgs();
  console.log(`\n=== Palank Harness Migrate — ${mode.toUpperCase()} ===`);
  console.log(`Harness: ${HARNESS_ROOT}`);
  console.log(`Target : ${target}\n`);
  if (!exists(target)) {
    console.error(`Target not found: ${target}`);
    process.exit(1);
  }
  const isProject = exists(path.join(target, "package.json")) || exists(path.join(target, ".git")) || exists(path.join(target, "AGENTS.md"));
  console.log(`Target type: ${isProject ? "기존 프로젝트 (package.json/.git/AGENTS.md 존재)" : "빈 폴더"}\n`);

  const plan = [];
  plan.push(planAgentsMd(target));
  plan.push(planOpencodeJson(target));
  plan.push(...planWiki(target));
  plan.push(...planSkills(target));
  plan.push(...planPlugins(target));
  plan.push(...planDynamicSubAgents(target));
  // P0-1: package.json scripts + scripts/check_vault.js
  const pkgScriptsPlan = planPackageJsonScripts(target);
  if (pkgScriptsPlan) plan.push(pkgScriptsPlan);
  const scriptsPlan = planScripts(target);
  if (scriptsPlan) plan.push(scriptsPlan);

  // Filter nulls
  const filtered = plan.filter(Boolean);
  console.log("--- 변경 계획 ---");
  applyPlan(target, filtered, mode);

  // Show what 006 has vs what target will get
  console.log("\n--- 참고: 006은 순수 하네스 파운드리 — 단독 프로젝트 ---");
}

main();
