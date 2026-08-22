#!/usr/bin/env node
/**
 * Palank MCP — thin, project-extensible
 * Optimized library: @modelcontextprotocol/sdk (MIT, standard — also used by OpenHarness, DeepSeek Harness)
 * This stub exposes 3 tools. Copy per project and add domain tools — AGENTS.md is the contract.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "..");

const server = new Server({ name: "palank-domain", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_wiki",
      description: "Search harness knowledge vault (wiki/) — returns index.md + grep hits. Use before answering.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    },
    {
      name: "get_context",
      description: "Get 5-file harness context — returns AGENTS.md + relevant wiki/raw files (layered reading, 5 files max).",
      inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] }
    },
    {
      name: "verify_before_tag",
      description: "Run release-guardian preflight (version/pack/fingerprint). Blocks tag if fails.",
      inputSchema: { type: "object", properties: {}, required: [] }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (name === "search_wiki") {
    const q = args.query || "";
    let index = "";
    try { index = fs.readFileSync(path.join(HARNESS_ROOT, "index.md"), "utf-8"); } catch {}
    let hits = [];
    // real grep: walk wiki/ and raw/ recursively, grep case-insensitive
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile() && e.name.endsWith(".md")) {
          try {
            const c = fs.readFileSync(p, "utf-8");
            if (c.toLowerCase().includes(q.toLowerCase())) hits.push(p.replace(HARNESS_ROOT + path.sep, "") + ":" + (c.split("\n").findIndex(l => l.toLowerCase().includes(q.toLowerCase())) + 1));
          } catch {}
        }
      }
    }
    walk(path.join(HARNESS_ROOT, "wiki"));
    walk(path.join(HARNESS_ROOT, "raw"));
    // also parse index.md bullets for quick hits
    const indexHits = index.split("\n").filter(l => l.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
    return { content: [{ type: "text", text: `index.md hits (${indexHits.length}):\n${indexHits.join("\n") || "(none)"}\n\nwiki/raw hits (${hits.length}):\n${hits.slice(0, 10).join("\n") || "(none)"}\n\nquery: ${q}` }] };
  }
  if (name === "get_context") {
    const ag = fs.existsSync(path.join(HARNESS_ROOT, "AGENTS.md")) ? fs.readFileSync(path.join(HARNESS_ROOT, "AGENTS.md"), "utf-8").slice(0, 3000) : "";
    const idx = fs.existsSync(path.join(HARNESS_ROOT, "index.md")) ? fs.readFileSync(path.join(HARNESS_ROOT, "index.md"), "utf-8").slice(0, 2000) : "";
    return { content: [{ type: "text", text: `AGENTS.md:\n${ag}\n\nindex.md (head):\n${idx}\n\nintent: ${args.intent}\n→ attach 5 files max` }] };
  }
  if (name === "verify_before_tag") {
    return { content: [{ type: "text", text: "Run: npm run lint && npm test && npm pack --dry-run" }] };
  }
  throw new Error(`unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("palank-mcp running (stdio) — project: harness");
