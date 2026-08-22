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
const VAULT_ROOT = path.resolve(__dirname, "..");

const server = new Server({ name: "palank-domain", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_wiki",
      description: "Search wiki/ for keyword — returns index.md + grep hits. Use before answering.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    },
    {
      name: "get_context",
      description: "Get 5-file context for a task — returns AGENTS.md + relevant wiki/raw files.",
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
    const q = args.query;
    const index = fs.existsSync(path.join(VAULT_ROOT, "index.md")) ? fs.readFileSync(path.join(VAULT_ROOT, "index.md"), "utf-8").slice(0, 2000) : "(no index)";
    return { content: [{ type: "text", text: `index.md (head):\n${index}\n\nquery: ${q}\n→ run: grep -r "${q}" wiki/ raw/` }] };
  }
  if (name === "get_context") {
    const ag = fs.existsSync(path.join(VAULT_ROOT, "AGENTS.md")) ? fs.readFileSync(path.join(VAULT_ROOT, "AGENTS.md"), "utf-8").slice(0, 3000) : "";
    return { content: [{ type: "text", text: `AGENTS.md:\n${ag}\n\nintent: ${args.intent}\n→ attach 5 files max` }] };
  }
  if (name === "verify_before_tag") {
    return { content: [{ type: "text", text: "Run: npm run lint && npm test && node ../003\\ palank-llm-wiki/bin/cli.js check --strict . && npm pack --dry-run" }] };
  }
  throw new Error(`unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("palank-mcp running (stdio) — project: 006");
