# Harness Audit Log

Append-only ledger. Every wiki write updates index.md + log.md atomically.

## [2026-08-22] init | Palank Harness 0.1.0 — thin foundry bootstrapped
- Source: harness spec (AGENTS.md)
- Stack: OpenCode + muse-spark/qwen3.8/deepseek + MCP
- Guard: interpreter+verify+MCP+knowledge vault
- Vault: 3-tier check + dual ledger + event GC + fingerprint

## [2026-08-23] feat | SPEC.md + CI Lite gate — Trust Boundary & formal spec
- Spec: AGENTS.md (how) + SPEC.md (why) split — 003 4 invariants ported thin, sec 8 Trust Boundary (local infinite-loop nudge + Clean Room gate)
- Gate: .github/workflows/gate.yml PR-only Lite (lint + check:vault --strict + pack hygiene, fetch-depth:0)
- Pointers: CLAUDE.md/GEMINI.md → AGENTS.md one-line (anti-drift, SPEC.md:2.3)
- Package: files += SPEC.md/CLAUDE.md/GEMINI.md
- Verify: npm run verify 0 errors, check_vault skeleton PASS, yaml ok, pack clean

## [2026-08-23] feat | Worktree isolation — physical transparency
- Rule: AGENTS.md:36 5 Knowledge as Asset + Isolation — every experiment in git worktree, never on main (SPEC.md:8 Trust Boundary)
- Scripts: package.json sandbox:new/rm/list → scripts/worktree.js create/remove/list (event-log.jsonl)
- Proof: experiment-95 create → .env + wiki/concepts pollute only .worktrees/experiment-95, main git status clean (2 files only), remove → .worktrees gone, git worktree list 1
- Ignore: .gitignore:5 .worktrees/ + :8 .env already clean
