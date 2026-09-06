#!/usr/bin/env node
// grade.js — held-out oracle static grader (spike, atom 1: mechanism)
// Grades AGENT-PRODUCED ARTIFACTS ONLY as static text. NEVER imports,
// executes, or spawns the artifact — no agent code runs in this process.
// Prints exactly one verdict line: PASS / FAIL / TAMPERED.
//   PASS     — artifact satisfies the sealed grading rule.
//   FAIL     — artifact does not satisfy the rule (wrong answer).
//   TAMPERED — sealed.json is malformed or its hash mismatches the
//              .sha256 sidecar (case tampering, not agent failure).
// Exit codes: 0 PASS / 1 FAIL / 2 TAMPERED.
//
// Usage: node scripts/oracle/grade.js --sealed <case.sealed.json> --artifact <file-or-dir>
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalize } from "./record.js";

function verdict(word, exit, detail) {
  console.log(word);
  if (detail) console.error(`grade: ${detail}`);
  process.exit(exit);
}

function arg(name, argv) {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || i + 1 >= argv.length ? null : argv[i + 1];
}

// Static read only: artifact is treated as opaque UTF-8 text, never executed.
function readArtifact(target) {
  const st = statSync(target);
  if (st.isDirectory()) {
    const files = readdirSync(target).sort();
    return files.map((f) => readFileSync(path.join(target, f), "utf8")).join("\n");
  }
  return readFileSync(target, "utf8");
}

function main(argv) {
  const sealedPath = arg("sealed", argv);
  const artifactPath = arg("artifact", argv);
  if (!sealedPath || !artifactPath) {
    console.error("usage: node scripts/oracle/grade.js --sealed <case.sealed.json> --artifact <file-or-dir>");
    process.exit(2);
  }

  // 1) Tamper check: sealed.json must match its .sha256 sidecar.
  let sealed;
  try {
    sealed = JSON.parse(readFileSync(sealedPath, "utf8"));
  } catch {
    verdict("TAMPERED", 2, `${sealedPath} is not valid JSON`);
  }
  let sidecar;
  try {
    sidecar = readFileSync(`${sealedPath}.sha256`, "utf8").trim().split(/\s+/)[0];
  } catch {
    verdict("TAMPERED", 2, `missing sidecar ${sealedPath}.sha256 — run seal.js`);
  }
  const recomputed = createHash("sha256").update(canonicalize(sealed), "utf8").digest("hex");
  if (recomputed !== sidecar) verdict("TAMPERED", 2, `hash mismatch for ${sealedPath} (expected ${sidecar})`);
  const rule = sealed.grading_rule;
  if (!rule || (rule.type !== "contains" && rule.type !== "exact_hash") || typeof rule.value !== "string") {
    verdict("TAMPERED", 2, `${sealedPath} has no valid grading_rule`);
  }

  // 2) Static grading: plain-text comparison against the sealed rule.
  let text;
  try {
    text = readArtifact(artifactPath).replace(/\r\n/g, "\n");
  } catch (e) {
    verdict("TAMPERED", 2, `cannot read artifact ${artifactPath} — ${e.message}`);
  }
  if (rule.type === "contains") {
    if (text.includes(rule.value)) verdict("PASS", 0, null);
    verdict("FAIL", 1, `artifact lacks expected marker for case ${sealed.case}`);
  }
  const digest = createHash("sha256").update(text.trim(), "utf8").digest("hex");
  if (digest === rule.value) verdict("PASS", 0, null);
  verdict("FAIL", 1, `artifact hash mismatch for case ${sealed.case}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
