#!/usr/bin/env node
// ⚠️ thin v3.2 (palank-harness)에서는 사용 금지 — AGENTS.md 금지 절 참조. thin 설치는 cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ 파일 복사만으로 수행, npx harness-bootstrap / opencode init / .opencode/agent/*.md 수동 생성 절대 금지. 오염 시 python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"
/**
 * validate-schema.js — Lock schema validator (P1-6, palank-harness v3.2)
 * Pure Node stdlib, ESM. Makes the interpreter's "type-level refusal" claim real code:
 * a Lock schema that lacks required fields or whose echo.confirmed !== true is rejected.
 *
 * Schema: { intent, files, schema, opencode_call, model, mcp,
 *           echo: { summary, confirmed } }   // confirmed must be STRICT boolean true
 *
 * CLI: node scripts/validate-schema.js '<json>'   -> exit 0 valid / 1 invalid / 2 usage
 */
import { pathToFileURL } from "url";

const REQUIRED_FIELDS = ["intent", "files", "schema", "opencode_call", "model", "mcp", "echo"];

/**
 * Validate a Lock schema object. Returns { valid, errors }.
 * Exported for tests.
 */
export function validateSchema(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { valid: false, errors: ["schema must be a JSON object"] };
  }
  const errors = [];
  for (const key of REQUIRED_FIELDS) {
    if (!(key in value)) errors.push(`missing required field: ${key}`);
  }
  if (errors.length > 0) return { valid: false, errors };

  if (typeof value.intent !== "string" || value.intent.trim() === "") {
    errors.push("intent must be a non-empty string");
  }
  if (!Array.isArray(value.files)) {
    errors.push("files must be an array (scope/files list)");
  }
  for (const key of ["schema", "opencode_call", "model", "mcp"]) {
    const v = value[key];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
      errors.push(`${key} must be present (non-empty string or object)`);
    }
  }
  const echo = value.echo;
  if (typeof echo !== "object" || echo === null || Array.isArray(echo)) {
    errors.push("echo must be an object {summary, confirmed}");
  } else {
    if (typeof echo.summary !== "string" || echo.summary.trim() === "") {
      errors.push("echo.summary must be a non-empty string (plain-language intent summary)");
    }
    if (echo.confirmed !== true) {
      errors.push(
        `echo.confirmed must be strictly boolean true (got ${JSON.stringify(echo.confirmed)}) — unconfirmed schemas cannot Lock`
      );
    }
    // Optional echo.auto (pilot/kamikaze synthetic auto-confirmed) — must be boolean if present
    if ("auto" in echo && typeof echo.auto !== "boolean") {
      errors.push("echo.auto must be boolean if present (pilot/kamikaze synthetic auto-confirmed)");
    }
  }
  // Optional mode enum (3-mode MVP, backward compat: absent => guardian)
  if ("mode" in value) {
    const allowedModes = new Set(["guardian", "pilot", "kamikaze"]);
    if (typeof value.mode !== "string" || !allowedModes.has(value.mode)) {
      errors.push(`mode must be one of guardian|pilot|kamikaze if present (got ${JSON.stringify(value.mode)})`);
    }
  }
  // Strict cross-check: auto:true should only appear with pilot/kamikaze (guardian auto is suspicious; absent mode defaults to guardian)
  if (value.echo?.auto === true && (!("mode" in value) || value.mode === "guardian")) {
    errors.push("echo.auto:true is only allowed with mode pilot|kamikaze (guardian must wait for explicit yes)");
  }
  // Optional trivial tier validation (Fail-Closed): if trivial present, validate tier/reason/evidence
  if ("trivial" in value) {
    const t = value.trivial;
    if (typeof t !== "object" || t === null || Array.isArray(t)) {
      errors.push("trivial must be an object {tier, reason, evidence} if present");
    } else {
      const allowed = new Set(["FULL", "QUICK", "SKIPPED"]);
      if (!allowed.has(t.tier)) {
        errors.push(`trivial.tier must be one of FULL|QUICK|SKIPPED (got ${JSON.stringify(t.tier)})`);
      }
      if (typeof t.reason !== "string" || t.reason.trim() === "") {
        errors.push("trivial.reason must be a non-empty string");
      }
      if (t.tier === "SKIPPED") {
        if (typeof t.evidence !== "object" || t.evidence === null || Array.isArray(t.evidence)) {
          errors.push("trivial.evidence must be a non-empty object when tier is SKIPPED (fail-closed)");
        } else {
          if (Object.keys(t.evidence).length === 0) {
            errors.push("trivial.evidence must be non-empty when tier is SKIPPED (fail-closed)");
          }
          // evidence should contain files/totalLines for traceability
          if (!("files" in t.evidence)) {
            errors.push("trivial.evidence must contain 'files' (fail-closed)");
          }
        }
      } else {
        // For QUICK/FULL, evidence may be null or object, but if present must be object|null
        if ("evidence" in t && t.evidence !== null && typeof t.evidence !== "object") {
          errors.push("trivial.evidence must be object or null for QUICK/FULL");
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function main(argv) {
  const raw = argv[2];
  if (!raw || raw === "--help" || raw === "-h") {
    console.error('usage: node scripts/validate-schema.js \'{"intent":...,"echo":{"summary":...,"confirmed":true}}\'');
    process.exit(2);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    console.error(`INVALID: not parseable JSON — ${e.message}`);
    process.exit(1);
  }
  const result = validateSchema(obj);
  if (result.valid) {
    console.log("VALID: Lock schema ok (required fields present, echo.confirmed=true)");
    process.exit(0);
  }
  for (const err of result.errors) console.error(`INVALID: ${err}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv);
