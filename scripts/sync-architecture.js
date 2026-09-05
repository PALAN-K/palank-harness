#!/usr/bin/env node
/**
 * sync-architecture.js — md-to-html one-way renderer (SSOT enforcement)
 *
 * SSOT: wiki/architecture/*.md is master (Ledger).
 * - architecture.excalidraw is mirror plus inbox (View + Inbox), never parsed fully here.
 * - architecture.html is derived auto-view, regenerated from md core (tiers + Changelog).
 * - Changelog truth is package.json version + log.md ledger. Canvas card is mirror copy only.
 *
 * Idempotent: output contains no volatile timestamp, reruns produce identical bytes
 * unless md/log/package.json change (avoids perpetual drift / FULL stickiness).
 * Stdlib only, ESM. Exit 0 on success, 1 on missing SSOT.
 *
 * Usage: node scripts/sync-architecture.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OVERVIEW_MD = path.join(ROOT, "wiki", "architecture", "006-overview.md");
const PIPELINE_MD = path.join(ROOT, "wiki", "architecture", "006-pipeline.md");
const PKG_JSON = path.join(ROOT, "package.json");
const LOG_MD = path.join(ROOT, "log.md");
const HTML_PATH = path.join(ROOT, "architecture.html");

function readOrFail(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`[sync-architecture] missing SSOT ${label}: ${path.relative(ROOT, p)}`);
    process.exit(1);
  }
  return fs.readFileSync(p, "utf-8");
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const overview = readOrFail(OVERVIEW_MD, "overview md");
const pipeline = readOrFail(PIPELINE_MD, "pipeline md");
const pkgRaw = readOrFail(PKG_JSON, "package.json");
let version = "unknown";
try {
  version = JSON.parse(pkgRaw).version || "unknown";
} catch (e) {
  console.error(`[sync-architecture] package.json parse failed: ${e.message}`);
  process.exit(1);
}
const log = readOrFail(LOG_MD, "log.md");

// Latest changelog entry: last "## " section (append-only ledger, stable, no timestamp)
let latestLog = "";
const sections = log.split(/^## /m);
if (sections.length > 1) {
  latestLog = ("## " + sections[sections.length - 1]).trim();
} else {
  latestLog = log.trim().slice(0, 1200);
}
// Keep html stable: cap length, no volatile date
if (latestLog.length > 2000) latestLog = latestLog.slice(0, 2000) + "\n...";

// Tier rows: parse Allowlist table lines starting with "| **" (stable, md-driven)
const tierRows = overview
  .split("\n")
  .filter((l) => l.startsWith("| **"))
  .map((l) => l.trim());
const tierCount = tierRows.length;

// Pipeline steps: count lines starting with "[" or "产" no — count "[N." markers stably
const pipeSteps = pipeline
  .split("\n")
  .filter((l) => /^\[.+?\]/.test(l.trim()) || /^\[사용자/.test(l.trim()))
  .length;

function tierRowsHtml() {
  if (tierRows.length === 0) return "<tr><td colspan='4'>No tier rows in overview md</td></tr>";
  return tierRows
    .map((r) => {
      const cells = r
        .split("|")
        .slice(1, -1)
        .map((c) => `<td>${esc(c.trim().replace(/\*\*/g, ""))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n");
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>006 palank-harness v${esc(version)} — Architecture Auto-View (md-derived)</title>
  <style>
    :root { --bg:#0d1117; --card:#161b22; --border:#30363d; --text:#e6edf3; --muted:#8b949e; --blue:#388bfd; --purple:#a371f7; --green:#3fb950; --amber:#d29922; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; padding:32px 20px; }
    .container { max-width:1100px; margin:0 auto; }
    header { border-bottom:1px solid var(--border); padding-bottom:16px; margin-bottom:24px; }
    h1 { font-size:1.6rem; } .badge { font-size:.75rem; border:1px solid var(--blue); color:var(--blue); border-radius:20px; padding:2px 10px; margin-left:10px; }
    .ssot { background:var(--card); border:1px solid var(--border); border-left:4px solid var(--amber); border-radius:8px; padding:14px 16px; margin:18px 0; font-size:.9rem; color:var(--muted); }
    .ssot strong { color:var(--text); }
    table { width:100%; border-collapse:collapse; font-size:.85rem; margin:12px 0 24px; }
    th,td { border:1px solid var(--border); padding:8px 10px; text-align:left; vertical-align:top; }
    th { background:#21262d; } td:first-child { white-space:nowrap; }
    pre { background:#0d1117; border:1px solid var(--border); border-radius:8px; padding:14px; overflow:auto; font-size:.82rem; white-space:pre-wrap; }
    footer { margin-top:28px; color:var(--muted); font-size:.8rem; border-top:1px solid var(--border); padding-top:12px; }
    code { background:#21262d; padding:1px 6px; border-radius:4px; font-size:.85em; }
  </style>
</head>
<body>
<div class="container">
<header>
<h1>006 palank-harness <span class="badge">v${esc(version)} auto-view</span></h1>
<p style="color:var(--muted)">Derived from <code>wiki/architecture/*.md</code> via <code>npm run sync:architecture</code>. Do not hand-edit — fix md, rerun script.</p>
</header>
<div class="ssot"><strong>SSOT:</strong> md=master (Ledger) · canvas (<code>architecture.excalidraw</code>)=mirror+inbox (View+Inbox, diary only, Echo gate required) · html=this file=derived auto-view · Changelog truth=<code>package.json</code>+<code>log.md</code>. Canvas to code only via <code>gate:echo-confirmed</code> Task.</div>
<h2>3-Tier Allowlist (from 006-overview.md, ${tierCount} rows)</h2>
<table><thead><tr><th>계층</th><th>컴포넌트</th><th>역할</th><th>소스</th></tr></thead><tbody>
${tierRowsHtml()}
</tbody></table>
<h2>Pipeline (from 006-pipeline.md)</h2>
<p style="color:var(--muted)">Diary → Echo → Interview → Lock → Dispatch → Verify. Full flow lives in <code>wiki/architecture/006-pipeline.md</code>.</p>
<h2 style="margin-top:20px">Latest Changelog (from log.md ledger)</h2>
<pre>${esc(latestLog)}</pre>
<h2 style="margin-top:20px">Canvas inbox note</h2>
<p style="color:var(--muted)">Sticky notes in <code>architecture.excalidraw</code> are diary input. They never auto-execute. Interpreter captures them as diary, presents Echo summary, waits for <code>yes</code> (guardian), then Locks schema and dispatches via Task. This html file never reads canvas annotations as truth.</p>
<footer>006 palank-harness v${esc(version)} · md-to-html one-way · regen: <code>npm run sync:architecture</code> · SSOT: <code>wiki/architecture/*.md</code></footer>
</div>
</body>
</html>
`;

fs.writeFileSync(HTML_PATH, html, "utf-8");
console.log(`[sync-architecture] md->html ok: version=${version} tiers=${tierCount} overview=${overview.length}B pipeline=${pipeline.length}B -> architecture.html ${html.length}B (0 errors)`);
