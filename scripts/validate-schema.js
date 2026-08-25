#!/usr/bin/env node
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
