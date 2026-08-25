#!/usr/bin/env node
/**
 * Palank MCP — palank-domain server (v3, real implementations)
 * Library: @modelcontextprotocol/sdk (MIT standard).
 * Tools:
 *   search_wiki       — grep wiki/ + raw/, returns index.md hits + file:line matches (kept from v2)
 *   get_context       — layered reading: AGENTS.md head(3000) + index.md +
 *                       intent-keyword overlap ranking over wiki/raw, max 5 files,
 *                       ~4000 chars each  [was a stub in v2]
 *   verify_before_tag — spawns `npm run verify` at project root (timeout 120s),
 *                       returns {ok, output_tail}  [was a stub in v2]
 * Copy per project and add domain tools — AGENTS.md is the contract.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "..");
const FILE_LIMIT = 4000; // per-file truncate
const MAX_FILES = 5;

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function readHead(rel, limit) {
  try {
    return fs.readFileSync(path.join(HARNESS_ROOT, rel), "utf-8").slice(0, limit);
  } catch {
    return "";
  }
}

// intent -> lowercase keywords (alnum + hangul), deduped, len>=2
function keywords(intent) {
  return [
    ...new Set(
      String(intent || "")
        .toLowerCase()
        .split(/[^a-z0-9가-힣]+/)
        .filter((w) => w.length >= 2)
    ),
  ];
}

function scoreFile(relPath, content, kws) {
  const hay = (relPath + "\n" + content).toLowerCase();
  let score = 0;
  for (const kw of kws) score += Math.min(hay.split(kw).length - 1, 10); // cap per-keyword
  return score;
}

const server = new Server({ name: "palank-domain", version: "3.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_wiki",
      description: "Search harness knowledge vault (wiki/) — returns index.md + grep hits. Use before answering.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      annotations: { readOnlyHint: true }, // behavior hint pattern ported from basic-memory
    },
    {
      name: "get_context",
      description:
        "Get layered harness context — AGENTS.md head + index.md + intent-ranked wiki/raw files (max 5, ~4000 chars each).",
      inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] },
      annotations: { readOnlyHint: true }, // AGENTS.md head stays the FIRST return — stable prefix
    },
    {
      name: "verify_before_tag",
      description: "Run `npm run verify` preflight at project root (timeout 120s). Blocks tag if it fails.",
      inputSchema: { type: "object", properties: {}, required: [] },
      annotations: { idempotentHint: true }, // same input -> same gate result while sources unchanged
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "search_wiki") {
    const q = String(args.query || "").toLowerCase();
    let index = "";
    try {
      index = fs.readFileSync(path.join(HARNESS_ROOT, "index.md"), "utf-8");
    } catch {}
    const hits = [];
    for (const base of ["wiki", "raw"]) {
      for (const p of walkMd(path.join(HARNESS_ROOT, base))) {
        let c = "";
        try {
          c = fs.readFileSync(p, "utf-8");
        } catch {
          continue;
        }
        const lower = c.toLowerCase();
        if (q && lower.includes(q)) {
          const line = c.split("\n").findIndex((l) => l.toLowerCase().includes(q)) + 1;
          hits.push(path.relative(HARNESS_ROOT, p).replace(/\\/g, "/") + ":" + line);
        }
      }
    }
    const indexHits = index.split("\n").filter((l) => l.toLowerCase().includes(q)).slice(0, 5);
    return {
      content: [
        {
          type: "text",
          text: `index.md hits (${indexHits.length}):\n${indexHits.join("\n") || "(none)"}\n\nwiki/raw hits (${hits.length}):\n${hits.slice(0, 10).join("\n") || "(none)"}\n\nquery: ${args.query}`,
        },
      ],
    };
  }

  if (name === "get_context") {
    const ag = readHead("AGENTS.md", 3000);
    const idx = readHead("index.md", 2000);
    const kws = keywords(args.intent);
    const ranked = [];
    for (const base of ["wiki", "raw"]) {
      for (const p of walkMd(path.join(HARNESS_ROOT, base))) {
        const rel = path.relative(HARNESS_ROOT, p).replace(/\\/g, "/");
        let c = "";
        try {
          c = fs.readFileSync(p, "utf8");
        } catch {
          continue;
        }
        const s = scoreFile(rel, c, kws);
        if (s > 0) ranked.push({ rel, s, c });
      }
    }
    ranked.sort((a, b) => b.s - a.s || a.rel.localeCompare(b.rel));
    const picked = ranked.slice(0, MAX_FILES);
    const body =
      picked
        .map(
          (p, i) =>
            `[${i + 1}] ${p.rel} (score ${p.s})\n${p.c.slice(0, FILE_LIMIT)}${p.c.length > FILE_LIMIT ? "\n...(truncated)" : ""}`
        )
        .join("\n\n---\n\n") || "(no keyword overlap found)";
    return {
      content: [
        {
          type: "text",
          text: `AGENTS.md (head):\n${ag}\n\nindex.md:\n${idx}\n\nintent keywords: [${kws.join(", ")}]\nmatched wiki/raw files (${picked.length}, max ${MAX_FILES}):\n\n${body}`,
        },
      ],
    };
  }

  if (name === "verify_before_tag") {
    const res = spawnSync("npm", ["run", "verify"], {
      cwd: HARNESS_ROOT,
      encoding: "utf8",
      timeout: 120000,
      shell: process.platform === "win32",
    });
    const output_tail = ((res.stdout || "") + (res.stderr || "")).trim().slice(-4000);
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: res.status === 0, output_tail }, null, 2) }],
    };
  }

  throw new Error(`unknown tool: ${name}`);
});

await server.connect(new StdioServerTransport());
console.error("palank-mcp running (stdio) — palank-harness v3");
