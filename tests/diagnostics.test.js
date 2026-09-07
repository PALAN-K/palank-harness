import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, "..", "mcp", "server.js");

// Minimal mirror of mcp/server.js diagnostics logic (node --check + :line parse).
// server.js itself boots a stdio MCP transport on import, so tests exercise the
// contract here without spawning the server.
function diagnose(absPath) {
  const res = spawnSync("node", ["--check", absPath], { encoding: "utf8", timeout: 10000 });
  const output = ((res.stdout || "") + (res.stderr || "")).trim();
  if (res.status === 0) return { ok: true, line: null, message: "ok" };
  let line = null;
  for (const l of output.split("\n")) {
    const m = l.match(/:(\d+)(?::(\d+))?\s*$/);
    if (m) {
      line = parseInt(m[1], 10) || null;
      break;
    }
  }
  return { ok: false, line, message: output.split("\n").map((l) => l.trim()).filter(Boolean).pop() || "syntax error" };
}

function tmpJs(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diag-test-"));
  const file = path.join(dir, "sample.js");
  fs.writeFileSync(file, content, "utf8");
  return { dir, file };
}

test("diagnostics: valid JS file => ok", () => {
  const { dir, file } = tmpJs("export const x = 1;\n");
  try {
    const r = diagnose(file);
    assert.equal(r.ok, true);
    assert.equal(r.message, "ok");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnostics: broken JS => ok:false with line + message", () => {
  const { dir, file } = tmpJs("const = = broken ((\n");
  try {
    const r = diagnose(file);
    assert.equal(r.ok, false);
    assert.ok(typeof r.line === "number" && r.line >= 1, `expected line>=1, got ${r.line}: ${r.message}`);
    assert.ok(r.message.length > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnostics: mcp/server.js exposes the diagnostics tool (static wiring)", () => {
  const src = fs.readFileSync(SERVER, "utf8");
  assert.match(src, /name: "diagnostics"/);
  assert.match(src, /node.*--check/);
  assert.match(src, /readOnlyHint/);
});
