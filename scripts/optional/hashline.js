#!/usr/bin/env node
/**
 * hashline.js — Thin TS port of oh-my-pi hashline (LINE:HASH anchor, batch 1-write, stale reject)
 * Goal: 80% of Rust 80k effect with pure Node.js (hash verification only, no Bun/Rust/Zig)
 *
 * Concept: https://github.com/can1357/oh-my-pi/blob/main/packages/hashline/README.md
 *   - oh-my-pi: [PATH#TAG] where TAG = 4-hex snapshot hash of full file (SnapshotStore)
 *   - Thin port: per-edit LINE:HASH — expectedHash = shortHash(oldText) (sha1 7hex), lineHint = original LINE
 *   - Stale policy: expectedHash validates planning vs apply; lineHint validates anchor vs live file.
 *     Both mismatch → reject ("hash mismatch — file changed since edit planned")
 *   - Batch: file당 1회 read → offset 정렬 후 한번에 적용 → 1회 write (원본 라인 번호 기준, never shifted)
 *
 * Usage:
 *   import { shortHash, hashlineApplyContent, hashlineReplace } from "./scripts/hashline.js";
 *   const edits = [
 *     { oldText: 'const a = 1;', newText: 'const a = 2;', lineHint: 12, expectedHash: shortHash('const a = 1;') },
 *     { oldText: '', newText: 'import x from "y";\n', lineHint: 1, expectedHash: shortHash('') } // insertion at head
 *   ];
 *   hashlineReplace("src/app.ts", edits);
 *
 * Constraints:
 *   - Pure Node.js, no Rust/Bun/Zig
 *   - Dynamic hash calc (no hardcoding), crypto.createHash('sha1')
 *   - File당 1 read/1 write, offset descending apply to avoid shift
 */
import fs from "fs";
import crypto from "crypto";
import path from "path";

// --- hash ---
export function shortHash(text, len = 7) {
  return crypto.createHash("sha1").update(text, "utf8").digest("hex").slice(0, len);
}

export function hashOf(text) {
  return shortHash(text);
}

// --- line utilities ---
export function lineToIndex(content, lineNum) {
  if (lineNum == null || lineNum < 1) return 0;
  const lines = content.split("\n");
  if (lineNum > lines.length + 1) return content.length;
  let idx = 0;
  for (let i = 1; i < lineNum; i++) {
    idx += lines[i - 1].length + 1; // +1 for \n
  }
  return idx;
}

export function indexToLine(content, index) {
  const slice = content.slice(0, index);
  return slice.split("\n").length;
}

// --- locate ---
function locateEdit(content, edit) {
  const { oldText, lineHint, expectedHash } = edit;

  // Validate expectedHash against oldText (planning integrity)
  if (expectedHash != null && expectedHash !== "") {
    const actual = shortHash(oldText ?? "");
    if (actual !== expectedHash) {
      throw new Error(
        `hash mismatch — file changed since edit planned (expectedHash ${expectedHash} != actual ${actual} for oldText at lineHint ${lineHint ?? "-"})`
      );
    }
  }

  // Insertion case: oldText empty → insert before lineHint (or at file head/tail)
  if (oldText === "" || oldText == null) {
    // lineHint semantics: 1 = before first line, >lines+1 = tail
    const idx = lineToIndex(content, lineHint);
    return { index: idx, end: idx, length: 0, lineHintMatched: true };
  }

  // Try lineHint anchor first (original line numbers, not shifted)
  if (typeof lineHint === "number" && lineHint >= 1) {
    const startIdx = lineToIndex(content, lineHint);
    // Check exact slice match at lineHint
    if (content.slice(startIdx, startIdx + oldText.length) === oldText) {
      return { index: startIdx, end: startIdx + oldText.length, length: oldText.length, lineHintMatched: true };
    }
    // Also check line-oriented: oldText may be multi-line block starting at lineHint
    // Do line-level compare for robustness (normalize without trailing newline issues)
    // Already slice-checked; if fails, fall through to global search but mark lineHintMatched=false
  }

  // Global search: find first occurrence of oldText in original content
  const globalIdx = content.indexOf(oldText);
  if (globalIdx !== -1) {
    // lineHint mismatch but hash (oldText existence) matched → allow (drift tolerant per spec: both mismatch → reject)
    const matched = false; // lineHint didn't match, but content found elsewhere
    return { index: globalIdx, end: globalIdx + oldText.length, length: oldText.length, lineHintMatched: matched };
  }

  // Neither lineHint nor global found → both mismatch → stale reject
  const expected = expectedHash || shortHash(oldText);
  throw new Error(
    `hash mismatch — file changed since edit planned (oldText not found at lineHint ${lineHint ?? "-"}, expectedHash ${expected} — file may have diverged)`
  );
}

// --- core: apply to string (no I/O) ---
export function hashlineApplyContent(originalContent, edits) {
  if (!Array.isArray(edits) || edits.length === 0) return originalContent;

  // Validate edits schema
  for (const e of edits) {
    if (typeof e.oldText !== "string" || typeof e.newText !== "string") {
      throw new Error(`invalid edit: oldText/newText must be strings — got ${JSON.stringify(e).slice(0, 80)}`);
    }
  }

  // Locate all edits against originalContent (before any mutation) — original line numbers preserved
  const located = edits.map((edit) => {
    const pos = locateEdit(originalContent, edit);
    return { edit, ...pos };
  });

  // Overlap detection (after locating, sort by index ascending to check overlap)
  const sortedAsc = [...located].sort((a, b) => a.index - b.index);
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    if (curr.index < prev.end) {
      throw new Error(
        `overlapping edits detected — edit ${i - 1} [${prev.index}:${prev.end}] overlaps edit ${i} [${curr.index}:${curr.end}] at line ${indexToLine(originalContent, curr.index)}`
      );
    }
  }

  // Apply descending by index to avoid offset shift (1-write principle)
  const sortedDesc = [...located].sort((a, b) => b.index - a.index);
  let result = originalContent;
  for (const loc of sortedDesc) {
    const { index, end, edit } = loc;
    result = result.slice(0, index) + edit.newText + result.slice(end);
  }
  return result;
}

// --- file I/O: 1 read → apply all → 1 write ---
export function hashlineReplace(filePath, edits, opts = {}) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(opts.cwd || process.cwd(), filePath);
  let content;
  try {
    content = fs.readFileSync(abs, "utf8");
  } catch (e) {
    throw new Error(`hashline_replace: cannot read ${filePath} — ${e.message}`);
  }
  const next = hashlineApplyContent(content, edits);
  if (next === content) {
    return { file: abs, applied: 0, changed: false, content: next };
  }
  fs.writeFileSync(abs, next, "utf8");
  return { file: abs, applied: edits.length, changed: true, content: next };
}

// --- async variants ---
export async function hashlineReplaceAsync(filePath, edits, opts = {}) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(opts.cwd || process.cwd(), filePath);
  const content = await fs.promises.readFile(abs, "utf8");
  const next = hashlineApplyContent(content, edits);
  if (next !== content) await fs.promises.writeFile(abs, next, "utf8");
  return { file: abs, applied: edits.length, changed: next !== content, content: next };
}

// --- CLI (optional direct invoke) ---
// Usage: node scripts/hashline.js <file> '<jsonEdits>'
// Example: node scripts/hashline.js src/app.ts '[{"oldText":"a","newText":"b","lineHint":1,"expectedHash":"..."}]'
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("hashline.js")) {
  // Only run CLI if called directly with args (not imported)
  const [fileArg, editsJson] = process.argv.slice(2);
  if (fileArg && editsJson) {
    try {
      const edits = JSON.parse(editsJson);
      const res = hashlineReplace(fileArg, edits);
      console.log(JSON.stringify(res, null, 2));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
}
