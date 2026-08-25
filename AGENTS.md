# AGENTS.md — palank-harness v3.2 (thin constitution)

> Transparent-wrapper interpreter on opencode. Single source for ALL models — no per-model fork.

## Layout (fixed, 8 lines)

```
006 palank-harness/
|-- AGENTS.md              # constitution (this file)
|-- opencode.json          # provider/model registry + agents/plugins/mcp (SSOT)
|-- skills/interpreter/    # diary -> schema -> optimal call (Echo-first)
|-- skills/verify/         # mechanical gates: lint / vault / test / pack
|-- mcp/                   # MCP servers — one per domain (palank-domain)
|-- scripts/               # check_vault.js (vault linter), inventory.js (startup inventory as code)
|-- plugins/               # force-delegation.js — runtime hard block (guard layer 2 of 3)
`-- wiki/ + raw/ + index.md + log.md + tests/ + package.json   # vault + gates
```

## Rules (6 — Echo is #4, enforced by type+code)

> **ALWAYS delegate via Task to interpreter/verify — NEVER direct write/edit/bash from conductor.**

1. **Interpreter first.** Diary → Echo → Interview → Lock → opencode optimal call. Inventory is code (`npm run inventory`), not prose.
2. **One MCP per domain** (`mcp/palank-domain`). Wiki is the knowledge vault; every claim needs Raw.
3. **Clarify before contract.** Deterministic required-fields checklist `{intent, scope/files, done}` — ask missing fields only, batch 2-5, max 1 round. No confidence scores; front-load intent concretization.
4. **Echo before dispatch.** Any delegated work requires a plain-language intent summary presented to and confirmed by the user BEFORE schema Lock. Schema type requires `echo:{summary, confirmed:true}` — unconfirmed schemas cannot lock. Model-agnostic by type+code, not model personality.
5. **ALWAYS delegate via Task to interpreter/verify/explore** — never direct writes from conductor; explore delegation is allowed for research-only lookups. 3-layer enforcement: config deny (`opencode.json`) + `plugins/force-delegation.js` + prompt.
6. **Verification over vibes.** verify runs the machine itself — a model's "pass" is not a pass. hashline/worktree are NOT core; recover from git history `b14f1bb` if ever needed.

## Cache Economics (v3.1 — design guidance, 미실측)

1. **Stable prefix**: this constitution is immutable during a session — never edit mid-session; restart instead. Prompt assembly places volatile content (inventory output, task context) AFTER the stable prefix so reloads become cache hits (Aider `--cache-prompts`).
2. **Late compaction**: compact only at threshold — early compaction invalidates the whole cache; amortize the one rebuild over the long tail (OpenHands condenser).
3. **Delegation = isolation**: forced subagent delegation keeps the main thread's prefix small and stable — the economic rationale behind Rule 5.

## Verification

- `npm run lint` — node --check on plugins/force-delegation.js, scripts/check_vault.js, scripts/inventory.js, mcp/server.js
- `npm run check:vault` — scripts/check_vault.js --strict: every wiki page needs `> Raw:` into raw/, index parity, Vault-Base hash reachability
- `npm test` — node:test suites in tests/
- `npm run verify` — all of the above + `npm pack --dry-run` hygiene. Empty vault (0 pages, 0 rows) is a valid PASS skeleton.

## Footnote

v2 full tree (hashline/worktree included) is recoverable from git history: `git show b14f1bbcfd574590a6cd13b5b662fa3e994bca2e:<path>`.

<!-- vault: wiki 0 && index 0 -> PASS skeleton (scripts/check_vault.js) -->
