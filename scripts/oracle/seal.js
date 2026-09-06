#!/usr/bin/env node
// seal.js — held-out oracle hash seal (spike, atom 1: mechanism)
// Freezes a <case>.sealed.json with a sha256 sidecar so later tampering
// (answer/rule edits) is detectable by grade.js as TAMPERED.
// Stdlib-only (node:crypto, node:fs). Deterministic canonical JSON.
//
// Usage: node scripts/oracle/seal.js <sealed.json>
// Exit: 0 sealed / 1 usage / 2 io error. Prints "<hash>  <basename>".
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalize } from "./record.js";

function fail(code, msg) {
  console.error(`seal: ${msg}`);
  process.exit(code);
}

function main(argv) {
  const target = argv[0];
  if (!target || argv.length !== 1) fail(1, "usage: node scripts/oracle/seal.js <sealed.json>");
  let raw;
  try {
    raw = readFileSync(target, "utf8");
  } catch (e) {
    fail(2, `cannot read ${target} — ${e.message}`);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    fail(2, `${target} is not valid JSON — ${e.message}`);
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) fail(2, `${target} must be a JSON object`);
  const hash = createHash("sha256").update(canonicalize(obj), "utf8").digest("hex");
  const sidecar = `${target}.sha256`;
  try {
    writeFileSync(sidecar, `${hash}  ${path.basename(target)}\n`, "utf8");
  } catch (e) {
    fail(2, `cannot write ${sidecar} — ${e.message}`);
  }
  console.log(`${hash}  ${path.basename(target)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
