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

## Rules (thin, 5+1 — front-loaded)

> **ALWAYS delegate via Task to interpreter/verify — NEVER direct write/edit/bash from conductor.** Permission deny + hook enforce this; even open-weight models that ignore prompts are blocked.

1. **Interpreter first.** User speaks diary, harness converts to Excel (JSON Schema). Never pass raw prompt to builder. Interpreter is dynamic transparent wrapper — startup inventory (debug skill/config + glob) → LLM selects optimal harness function from runtime list.
2. **Verification over vibes.** `verify` runs `npm test` / `pack` itself. Model's "tests pass" is not a pass.
3. **Contracts before prompts.** Schema first, then code. No guessing without typed contract.
4. **Least privilege.** Subagents get only needed tools/files — never full repo.
5. **Knowledge as Asset + Isolation.** wiki is spec (static encyclopedia), harness is scaffolding (disposable). Every claim needs Raw: verbatim or official docs citation. **Every experiment runs in `git worktree` — never on `main`.** Entry: `npm run sandbox:new <id>` → work in `.worktrees/<id>/` → verify there → merge back. Keeps `main` clean (physical transparency, see `SPEC.md:8` Trust Boundary and `scripts/worktree.js:1`).
6. **Clarify Before Contract.** 모호도 임계치 넘으면 배치 질문 후 스키마 잠금 — `confidence <0.7` 또는 `intent=build|migrate` + `ambiguous(schema|intent|files)` 일 때만 `question` 툴로 배치 질문(2~5개, 선택지+Recommended+직접입력) 후 스키마 잠금. `required` 필드만 질문, `optional`은 기본값 유지, **max 1라운드 원칙**(명확하면 스킵, 재질문 금지). 모호한 요구는 추측 금지 — 배치 질문으로 해소 후 명시적 확인. See `skills/interpreter/SKILL.md:2.5 GRILL(soft)`.

## Model Routing (user selectable, default: muse-spark for bulk, qwen3.8 for terminal)

- Bulk generation (7B doable): `deepseek-v4-flash` / `muse-spark-1.2` (cheap)
- Terminal / tool-heavy: `qwen3.8-pro` (strong terminal, per Artificial Analysis)
- Hard reasoning: `deepseek-v4-pro` / `qwen3.8-pro` (escalate)
- Change in `opencode.json` 1 line — harness stays.

## Verification

`npm run lint` (syntax) + `npm run check:vault --strict` (evidence) + `npm test` (project). Zero errors required.
`npm run verify` = all + `pack --dry-run` hygiene.
`wiki 0 && index 0 → PASS (skeleton)` — empty vault is valid initial state, not an error (skeleton is not error, see `scripts/check_vault.js:58`).

## MCP

One MCP per domain. `mcp/palank-domain` is the stub — copy per project, add tools, keep `AGENTS.md` as the contract.

**Routing:** `opencode.json:mcp.<name>.type ∈ {local,remote}` — `local` = stdio (`command: ["node","mcp/server.js"]`, Thin 3툴), `remote` = HTTP (`url: "https://your-domain/api/mcp"`, Domain 15툴, Vercel). See `mcp/README.md: Thin vs Domain` and `templates/opencode.json.template: mcp`.

## Harness Principle

Framework (`006`) is the foundry — thin, model-agnostic, disposable. Keep harness disposable: spec is the asset. Normative spec: `SPEC.md` (why), runtime constitution: this file (how). See `SPEC.md:8` Trust Boundary.

## Spec

`SPEC.md` is the normative companion — humans/reviewers read it, agents read this file. Enforcement lives in `scripts/check_vault.js`, not in prose.
