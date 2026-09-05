# AGENTS.md — palank-harness v3.3 (thin constitution)

> Transparent-wrapper interpreter on opencode. Single source for ALL models — no per-model fork.

## Layout (fixed, 8 lines)

```
006 palank-harness/
|-- AGENTS.md              # constitution (this file)
|-- opencode.json          # provider/model registry + agents/plugins/mcp (SSOT)
|-- skills/interpreter/    # diary -> schema -> optimal call (Echo-first)
|-- skills/verify/ + skills/excalidraw/ + skills/reviewer/  # gates + canvas mirror (md->html one-way, inbox diary) + FULL advisory
|-- mcp/                   # MCP servers — one per domain (palank-domain)
|-- scripts/               # check_vault.js (vault linter), inventory.js (inventory as code), validate-schema.js (Lock gate), sync-version.js (version SSOT), tiered-verify.js (tier gate, Fail-Closed 3-stage), verify-tiered.js (tier dispatcher), sync-architecture.js (md->html one-way, canvas mirror)
|-- plugins/               # force-delegation.js — runtime hard block (guard layer 2 of 3)
|-- foundry/               # foundry-only, excluded from npm pack (brainstorm/verify-history)
`-- wiki/ + raw/ + index.md + log.md + tests/ + package.json   # vault + gates (architecture.excalidraw/html are root mirror/view, md-master, pack-excluded, regen via sync:architecture)
```

## Rules (6 — Echo is #4, enforced by type+code)

> **ALWAYS delegate via Task to interpreter/verify — NEVER direct write/edit/bash from conductor.**

1. **Interpreter first.** Diary → Echo → Interview → Lock → opencode optimal call. Inventory is code (`npm run inventory`), not prose.
2. **One MCP per domain** (`mcp/palank-domain`). Wiki is the knowledge vault; every claim needs Raw.
3. **Clarify before contract.** Deterministic required-fields checklist `{intent, scope/files, done}` — ask missing fields only, batch 2-5, max 1 round. No confidence scores; front-load intent concretization.
4. **Echo before dispatch.** Any delegated work requires a plain-language intent summary presented to and confirmed by the user BEFORE schema Lock. Schema type requires `echo:{summary, confirmed:true}` — unconfirmed schemas cannot lock. Model-agnostic by type+code, not model personality.
5. **ALWAYS delegate via Task to interpreter/verify/explore** — never direct writes from conductor; explore delegation is allowed for research-only lookups. 3-layer enforcement: config deny (`opencode.json`) + `plugins/force-delegation.js` + prompt.
6. **Verification over vibes.** verify runs the machine itself — a model's "pass" is not a pass. hashline/worktree are NOT core; recover from git history `b14f1bb` if ever needed.

## 금지 — thin 설치·오염 방지 (모든 AI 필수 준수 — pit of success)

- `.opencode/agent/*.md` 수동 생성 금지 — thin 헌법은 `opencode.json`의 3 agents(`conductor`/`interpreter`/`verify`)만 사용한다. `harness`, `reviewer`, `researcher` 등 추가 파일은 전역 오염이며 생성·복사 금지. 발견 시 즉시 삭제: `python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"`
- 전역 `harness-bootstrap` 스킬, `opencode init` 금지 — thin 설치는 `006 palank-harness`에서 파일 복사(`AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/`)만으로 수행한다. `npx harness-bootstrap` / `opencode init`으로 생성된 `.opencode/`는 오염으로 간주해 삭제한다.
- WSL 경로는 `~/projects/<repo>` (Linux 절대경로)만 사용한다. Windows UNC(`\\wsl.localhost\...`)는 읽기만 허용, 쓰기 금지.
- 의심 시 `npm run inventory`로 agents가 3개인지 확인 — `scripts/check_vault.js`와 `scripts/inventory.js`가 금지 파일을 FAIL로 차단한다.

## Cache Economics (v3.1 — design guidance, 미실측)

1. **Stable prefix**: this constitution is immutable during a session — never edit mid-session; restart instead. Prompt assembly places volatile content (inventory output, task context) AFTER the stable prefix so reloads become cache hits (Aider `--cache-prompts`).
2. **Late compaction**: compact only at threshold — early compaction invalidates the whole cache; amortize the one rebuild over the long tail (OpenHands condenser).
3. **Delegation = isolation**: forced subagent delegation keeps the main thread's prefix small and stable — the economic rationale behind Rule 5.

## Verification

- `npm run lint` — node --check on plugins/force-delegation.js, scripts/check_vault.js, scripts/inventory.js, scripts/validate-schema.js, scripts/tiered-verify.js, scripts/verify-tiered.js, scripts/sync-version.js, scripts/sync-architecture.js, mcp/server.js
- `npm run check:vault` — scripts/check_vault.js --strict: every wiki page needs `> Raw:` into raw/, index parity, Vault-Base hash reachability, markdown link targets (index.md + wiki/**)
- `npm test` — node:test suites in tests/
- `npm run check:version` — scripts/sync-version.js --check: live release tokens (mcp/package.json, mcp/package-lock.json, AGENTS.md H1, README.md H1, package.json description) derive from the root package.json master; drift exits 1. log.md history and wiki/raw provenance labels are excluded by design. Apply with `npm run sync:version`.
- `npm run verify` — all of the above (`lint` + `check:vault` + `test` + `check:version`) + `npm pack --dry-run` hygiene. Empty vault (0 pages, 0 rows) is a valid PASS skeleton.

## Footnote

v2 full tree (hashline/worktree included) is recoverable from git history: `git show b14f1bbcfd574590a6cd13b5b662fa3e994bca2e:<path>`.

<!-- vault: wiki 0 && index 0 -> PASS skeleton (scripts/check_vault.js) -->
