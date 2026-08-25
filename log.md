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

## [2026-08-23] feat | Global-aware harness — hasGlobalHarness() gate (98%)
- Detect: bin/cli.js + scripts/migrate.js hasGlobalHarness() → ~/.config/opencode/skills/interpreter vs ~/.agents/skills/interpreter
- Init: global true → skip skills/plugins copy, log "[harness] global ... Thin", tmp test-proj-global-check skills False/plugins False/wiki True vs no-global skills True/plugins True
- Migrate: global true → planSkills/plugins skip "전역 하네스 존재 — 글로벌이 소유" (Thin), false → create/skip 기존 유지
- Proof: worktree experiment-global-split — hasGlobal false 9/4, fake global true 8/5 + init skip, fake 제거 후 false 복구, lint ok, main clean
- Impact: 기존 프로젝트 영향 0, 미래 harness-bootstrap SSOT 편입 시 자동 Thin (project domain only)

## [2026-08-25] feat | Thin Foundry v2 skeleton — 50+80+60+60 core, archive v1
- Seed: wiki/concepts/thin-foundry.md — why thin, Vault-Base: git:7c2e97d, Monitored: AGENTS.md/SPEC.md/skills/*, Raw: archive/006-palank-harness-v1-20260825/SPEC.md (30 lines, distilled from v1 435줄)
- Skeleton: AGENTS.md 50 lines (was 74, Clarify promoted to #3), SPEC.md 80 lines (was 150, Trust Boundary retained), skills/interpreter 60 lines (was 126), skills/verify 60 lines (was 95) — total <250 core
- Archive: git mv 29 files → archive/006-palank-harness-v1-20260825/ — history preserved, `git log --follow -- archive/.../AGENTS.md` tracks v1, hashline 185줄 + worktree 66줄 → scripts/optional appendix
- Routing: opencode.json tier SSOT (_routing_note 1 line, tier:minimal/bulk-cheap/terminal-strong/reasoning-frontier), dynamicSubAgents.json tiers, package.json 0.2.0 thin (lint core only)
- Verify: wiki 1 && index 1 parity ok, raw citation archive exists, drift Vault-Base git:7c2e97d reachable (fetch-depth:0), `npm run verify` pending
- Next: cherry-pick tier/migration _routing_note + core files (already restored from archive) → `npm run lint && npm run check:vault --strict && npm test && npm pack --dry-run` + grep model names + gate.yml
