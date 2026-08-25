---
name: verify
description: >
  Model-agnostic coding guard — scaffold / lint / loop.
  Use when user says "검증", "린트", "배포 전", "완료", "테스트 통과".
  Runs checks itself, never trusts model "tests pass".
---

# Verify — scaffold / lint / loop (model-agnostic, 60 lines)

`interpreter`가 스키마로 바꾸면, 이 스킬이 **기계 검증**을 한다. 모든 티어가 같은 가드 — `AGENTS.md` 얇은 표준.

## Triggers
- `scaffold`, `init`, `스캐폴드` — vault/harness scaffolding
- `lint`, `검증`, `check` — 3-tier health check
- `loop`, `완료`, `배포 전` — preflight gate

## 1. Scaffold (이중장부 10줄)
- `raw/` immutable never edit, `wiki/` LLM-owned, `index.md` 1 line/page, `log.md` append-only
- `archive/` isolation — 삭제 금지, 이동만. `index.md + log.md` atomic dual-write (둘 다 갱신 or 둘 다 실패)
- `AGENTS.md` 단일 소스, `opencode.json` 라우팅 SSOT, `mcp/`는 프로젝트별 1개씩 확장, `skills/`는 하네스 소유
- Harness disposable, spec is asset — foundry는 비계, 다음 분기 모델 교체 시 스캐폴드 유지
- Vault 3-layer: raw (you own), wiki (LLM owns), AGENTS.md (co-evolve) — SPEC.md:2

## 2. Lint (3 tiers, 15줄)
- **Safe fixes** — 기계적으로 고칠 수 있는 것만: `index.md` 줄 수 vs `wiki/**/*.md` 일치, `wiki→raw/` 링크 존재 여부 — 자동 수정 가능
- **Mechanical** — `node scripts/check_vault.js --strict .` 실행, 0 suspects/0 errors/0 unreferenced 필수. every number/date/quote must be cited verbatim from raw or official docs — `wiki 0 && index 0 → PASS` skeleton (check_vault.js:58)
- **Judgment** — 모순, 오래된 주장, 고아 페이지 — report only (자동 수정 금지, 사람 판단)
- Hard rule: No guessing, official docs only — evidence 없는 interpreter는 여기에서 블럭
- Enforcement: 프롬프트가 아니라 게이트. 세션이 길어 AGENTS.md를 잊어도 verify가 기계로 다시 강제.

## 3. Loop (harness vault lifecycle, 10줄)
- **Drift** — `Vault-Base: git:<hash>` + `Tracked: <paths>`를 index.md/wiki/에 기록, `git diff --name-only <hash> -- <paths>`로 0-token check (0.01s). empty → fresh.
- **GC (event-based, No TTL)** — 시간 기반 삭제 금지. dependency/source change 시 `Status: Outdated — superseded by <new> (archived)` 블록 삽입. Full replace → `archive/YYYY-MM-DD/<path>`로 이동, never delete
- **Pattern Harvest** — `log.md`에 2+ repeats(동일 이슈 2회 이상) → `scan:skills` 후보로 제안 (proposal-first, 자동 생성 금지)
- Vault is stateful store — nothing ever deleted, superseded material moves through statuses: New → Update → Disputed → Outdated → archive
- **Loop Guard** — verify 루프 최대 2회 재시도, `lint` 실패 시 즉시 중단 (무한 루프 방지, Thin 원칙)
- **Quick Path** — 간단한 작업(`research`/`review`/문서 1-2줄, `intent≠build|migrate`)은 `npm run lint && npm run check:vault --strict` 통과로 `verify` 갈음 (0.88s vs 1.70s ~48% 절약, KV 캐시 유지 — AGENTS.md 50줄 캐시 히트)

## Preflight (태그 전 필수, 5줄)
```bash
npm run lint
npm run check:vault --strict
npm test
npm pack --dry-run 2>&1 | grep -q "__pycache__" && exit 1 || echo "clean"
```
실패 시 태그 금지. release-guardian 5-step (version/tag sync, pack hygiene, fetch-depth, forbidden pattern) 일반화 계승.

## 4. Hashline — stale-safe edits (appendix 1줄, core 아님)
Thin port of oh-my-pi hashline: LINE:HASH 앵커 + 파일당 배치 1회 + stale 거부 — see `archive/006-palank-harness-v1-20260825/scripts/hashline.js` (185줄) + `archive/.../skills/interpreter/references/hashline.md` for full protocol. Current harness는 appendix로만 참조, `skills/verify/SKILL.md:4` 1줄 링크.

## Hard rules
- No guessing, official docs only — interpreter without evidence is blocked here.
- Skills never inside `mcp/` (하네스 소유 분리). Proposal-first for new skill.
- Enforcement는 게이트 — 프롬프트 무시해도 모델 불문 블럭.

## Why model-agnostic
특정 `provider/model`에만 가드를 쓰면 모델 전용이 된다. `AGENTS.md`에 쓰면 모든 티어가 같은 게이트 통과 — 모델 교체 시 가드 유지. 이것이 얇은 하네스 핵심. Thin: 60 lines here + 60 interpreter + 50 AGENTS + 80 SPEC = 250.
## Appendix — history + optional tools
- v1 verify 95 lines → v2 60 lines — distilled core, archive retains full 95 lines for reference (`archive/006-palank-harness-v1-20260825/skills/verify/SKILL.md`).
- Hashline detail: `shortHash(oldText)` sha1 7hex + `lineHint` → `hashlineApplyContent()` → descending offset apply → 1 write. Both mismatch → `hash mismatch — file changed since edit planned` → verify loop 재시도. See `archive/.../tests/hashline.test.js` for stale reject test.
- Worktree detail: `scripts/worktree.js` create/remove/list — `git worktree add .worktrees/<id> HEAD` + `event-log.jsonl` replay-exact — optional, not core, see `archive/.../scripts/worktree.js` (66줄).
- `scripts/hashline.js` + `scripts/worktree.js` are appendix optional — not required for `npm run verify` core (lint + check:vault + test + pack). Core is `scripts/check_vault.js` 116 lines only.
- Vault-Base: git:7c2e97d — archived v1 had entangled hashline 185줄 + worktree 66줄 = 251줄 appendix. New skeleton core 116(check_vault) + 60+60(skills) + 50+80(AGENTS+SPEC) = 366줄, lighter by ~70줄 vs v1 435줄.
- Next steps: after skeleton, `npm run lint && npm run check:vault --strict` → wiki 0 && index 0 → PASS verification, then cherry-pick tier/migration for opencode.json _routing_note, copy mcp/server.js, scripts/check_vault.js, etc. from archive as needed.
- Conductor delegation: `plugins/force-delegation.js` 34 lines — Layer 2 runtime hard block (even open-weight that ignores prompt). Layer1: opencode.json permission deny, Layer3: AGENTS.md prompt. 3-layer guard, model-agnostic.
- Templates: `templates/` + `dynamicSubAgents.json` + `bin/cli.js` are cherry-picked from archive in next phase — not core for skeleton, but needed for `npm pack` hygiene and init/migrate.
- CI Lite: `.github/workflows/gate.yml` — PR-only thin gate, fetch-depth:0 for drift, no setup-node, uses pristine main checkout — external audit against Contaminated Verifier.
- `npm run verify` = `npm run lint --silent && npm run check:vault --silent && npm test --silent` + `pack --dry-run` — zero errors required, skeleton PASS is valid initial state.
- See `SPEC.md:8` Trust Boundary — local infinite-loop nudge + Clean Room gate, neither replaces the other. Preserve Thin/Disposable.
- See `index.md` + `log.md` dual-write invariant — every wiki write updates both atomically. `check_vault.js:61` parity check enforces.
- Prepared for `opencode run --agent verify "Fresh Thin Foundry 4단계 검증"` — model-agnostic guard, all tiers same gate.
