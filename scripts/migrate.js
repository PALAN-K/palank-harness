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
  // Shallow merge check: compare provider keys
  try {
    const t = JSON.parse(readIfExists(targetFile) || "{}");
    const h = JSON.parse(readIfExists(harnessFile) || "{}");
    const tProviders = Object.keys(t.provider || {});
    const hProviders = Object.keys(h.provider || {});
    const missing = hProviders.filter(k => !tProviders.includes(k));
    if (missing.length === 0) {
      return { action: "skip", file: "opencode.json", detail: "provider 이미 모두 존재 — 건너뜀" };
    }
    return { action: "merge", file: "opencode.json", detail: `provider 병합 필요: ${missing.join(", ")} 추가` };
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
        } else if (p.action === "create" && p.file.endsWith("/")) {
          fs.mkdirSync(path.join(target, p.file), { recursive: true });
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
        } else if (p.action === "create" && (p.file === "index.md" || p.file === "log.md")) {
          fs.copyFileSync(path.join(HARNESS_ROOT, p.file), path.join(target, p.file));
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

  // Filter nulls
  const filtered = plan.filter(Boolean);
  console.log("--- 변경 계획 ---");
  applyPlan(target, filtered, mode);

  // Show what 006 has vs what target will get
  console.log("\n--- 참고: 006은 순수 하네스 파운드리 — 단독 프로젝트 ---");
}

main();
