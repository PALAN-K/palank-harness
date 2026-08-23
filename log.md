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
