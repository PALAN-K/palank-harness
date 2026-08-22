# AGENTS.md — Palank Harness (Thin)

> Single source for ALL models. Claude reads CLAUDE.md, Gemini reads GEMINI.md, but every thin harness reads this file first. No per-model fork.

## Harness = Model + Guard

- **Model**: rented, swappable — `muse-spark-1.2`, `qwen3.8-pro`, `deepseek-v4-flash`, `deepseek-v4-pro`
- **Harness**: owned, deterministic — `interpreter`, `verify`, `MCP`

## Layout (fixed)

```
006 palank-harness/
├── AGENTS.md              # this file — constitution for every agent
├── opencode.json          # provider/model registry + routing (user selectable)
├── skills/
│   ├── interpreter/       # natural language → schema → opencode optimal call
│   └── verify/            # scaffold / lint / loop guard (model-agnostic)
├── mcp/                   # MCP servers — one per domain, project-extensible
├── wiki/                  # harness knowledge vault (static encyclopedia)
├── raw/                   # immutable verbatim sources (evidence)
├── archive/               # outdated knowledge (Status: Outdated, no delete)
├── index.md               # vault map (1 line per page)
├── log.md                 # audit ledger (atomic with index.md)
└── package.json           # harness scripts
```

## Rules (thin, 4+1 — front-loaded)

> **ALWAYS delegate via Task to interpreter/verify — NEVER direct write/edit/bash from conductor.** Permission deny + hook enforce this; even open-weight models that ignore prompts are blocked.

1. **Interpreter first.** User speaks diary, harness converts to Excel (JSON Schema). Never pass raw prompt to builder.
2. **Verification over vibes.** `verify` runs `npm test` / `pack` itself. Model's "tests pass" is not a pass.
3. **Contracts before prompts.** Schema first, then code. No guessing without typed contract.
4. **Least privilege.** Subagents get only needed tools/files — never full repo.
5. **Knowledge as Asset.** wiki is spec (static encyclopedia), harness is scaffolding (disposable). Every claim needs Raw: verbatim or official docs citation.

## Model Routing (user selectable, default: muse-spark for bulk, qwen3.8 for terminal)

- Bulk generation (7B doable): `deepseek-v4-flash` / `muse-spark-1.2` (cheap)
- Terminal / tool-heavy: `qwen3.8-pro` (strong terminal, per Artificial Analysis)
- Hard reasoning: `deepseek-v4-pro` / `qwen3.8-pro` (escalate)
- Change in `opencode.json` 1 line — harness stays.

## Verification

`npm run lint` (syntax) + `npm run check:vault --strict` (evidence) + `npm test` (project). Zero errors required.
`npm run verify` = all + `pack --dry-run` hygiene.

## MCP

One MCP per domain. `mcp/palank-domain` is the stub — copy per project, add tools, keep `AGENTS.md` as the contract.

## Harness Principle

Framework (`006`) is the foundry — thin, model-agnostic, disposable. Keep harness disposable: spec is the asset.
