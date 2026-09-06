#!/usr/bin/env node
// record.js — held-out oracle case recorder (spike, atom 1: mechanism)
// Creates a hidden grading case: agent sees ONLY <case>.prompt.md,
// the answer/grading rule stays sealed in <case>.sealed.json.
// Stdlib-only (node:crypto, node:fs, node:path). Never prints the answer.
//
// Usage:
//   node scripts/oracle/record.js --out <dir> --case <name> \
//     --prompt <prompt.md> (--answer <file> | --expected <string>) \
//     [--rule contains|exact_hash]
//
// Exit: 0 ok / 1 usage error / 2 io error.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// Deterministic canonical JSON (sorted keys, recursive) — shared with seal.js.
export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function usage(msg) {
  if (msg) console.error(`record: ${msg}`);
  console.error(
    "usage: node scripts/oracle/record.js --out <dir> --case <name> --prompt <prompt.md> (--answer <file> | --expected <string>) [--rule contains|exact_hash]"
  );
  process.exit(1);
}

function arg(name, argv) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= argv.length) return null;
  return argv[i + 1];
}

function main(argv) {
  const out = arg("out", argv);
  const name = arg("case", argv);
  const promptFile = arg("prompt", argv);
  const answerFile = arg("answer", argv);
  const expected = arg("expected", argv);
  const rule = arg("rule", argv) ?? "contains";
  if (!out) usage("missing --out <dir>");
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) usage("bad --case <name> (lowercase alnum+hyphen)");
  if (!promptFile) usage("missing --prompt <prompt.md>");
  if (!answerFile && expected === null) usage("need --answer <file> or --expected <string>");
  if (answerFile && expected !== null) usage("--answer and --expected are exclusive");
  if (rule !== "contains" && rule !== "exact_hash") usage("--rule must be contains|exact_hash");

  let promptText;
  let answerText;
  try {
    promptText = readFileSync(promptFile, "utf8");
    answerText = answerFile !== null ? readFileSync(answerFile, "utf8") : expected;
  } catch (e) {
    console.error(`record: cannot read input — ${e.message}`);
    process.exit(2);
  }
  const normalized = answerText.replace(/\r\n/g, "\n");
  const gradingRule =
    rule === "contains"
      ? { type: "contains", value: normalized.trim() }
      : { type: "exact_hash", value: sha256(normalized.trim()) };
  const sealed = {
    case: name,
    created_at: new Date().toISOString().slice(0, 19) + "Z",
    grading_rule: gradingRule,
    hidden_answer_hash: sha256(normalized.trim()),
    prompt_bundle_hash: sha256(promptText),
    version: 1,
  };
  mkdirSync(out, { recursive: true });
  const sealedPath = path.join(out, `${name}.sealed.json`);
  const promptPath = path.join(out, `${name}.prompt.md`);
  try {
    writeFileSync(sealedPath, `${canonicalize(sealed)}\n`, "utf8");
    writeFileSync(promptPath, promptText, "utf8");
  } catch (e) {
    console.error(`record: cannot write output — ${e.message}`);
    process.exit(2);
  }
  // Deliberately answer-free stdout: paths + hashes only.
  console.log(`recorded: ${sealedPath}`);
  console.log(`prompt: ${promptPath}`);
  console.log(`prompt_bundle_hash: ${sealed.prompt_bundle_hash}`);
  console.log(`hidden_answer_hash: ${sealed.hidden_answer_hash}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
