---
name: verify
description: >
  Model-agnostic coding guard — scaffold / lint / loop.
  Use when user says "검증", "린트", "배포 전", "완료", "테스트 통과".
  Runs checks itself, never trusts model's "tests pass".
---

# Verify — scaffold / lint / loop (model-agnostic)

`interpreter`가 스키마로 바꿔주면, 이 스킬이 **기계 검증**을 한다. `Opus`/`Qwen`/`Spark`/`DeepSeek` 모두가 같은 가드를 쓴다 — `AGENTS.md`가 얇은 하네스 표준이므로.

## Triggers

- `scaffold`, `init`, `스캐폴드`
- `lint`, `검증`, `check`
- `loop`, `완료`, `배포 전`

## 1. Scaffold

raw/ immutable never edit, wiki/ LLM-owned, index.md 1 line/page, log.md append-only, archive/ isolation, index+log atomic dual-write. Harness disposable, spec is asset.

- `AGENTS.md` 단일 소스 유지, `opencode.json` 라우팅 유지
- `mcp/`는 프로젝트별 1개씩 확장, `skills/`는 하네스 소유
- `raw/`는 불변 (never edit) — verbatim 원전 보관
- `wiki/`는 LLM 소유 (LLM-owned) — 요약·증류
- `index.md`는 1 line/page 카탈로그
- `log.md`는 append-only 감사 로그
- `archive/` 격리 — 삭제 금지, 이동만
- `index.md + log.md`는 atomic dual-write (둘 다 갱신 or 둘 다 실패)

## 2. Lint (3 tiers, harness-native)

- Safe fixes: index.md row count vs wiki/**/*.md, source links (wiki→raw/)
- Mechanical: node scripts/check_vault.js --strict . (0 suspects/0 errors/0 unreferenced, every number/date/quote must be cited verbatim from raw/ or official docs)
- Judgment: contradiction, stale claims, orphan pages — report only

Hard rule: No guessing, official docs only — interpreter without evidence is blocked here.

- **Safe fixes** — 기계적으로 고칠 수 있는 것만: `index.md` 줄 수 vs `wiki/**/*.md` 일치, 소스 링크 (`wiki→raw/`) 존재 여부
- **Mechanical** — `node scripts/check_vault.js --strict .` 실행, 0 suspects/0 errors/0 unreferenced 필수. every number/date/quote must be cited verbatim from raw/ or official docs
- **Judgment** — 모순, 오래된 주장, 고아 페이지 — report only (자동 수정 금지)

## 3. Loop (harness vault lifecycle)

- Drift: Vault-Base: git:<hash> + Tracked: <paths> → `git diff --name-only <hash> -- <paths>` 0-token check, 0.01s. If empty → fresh.
- GC (event-based, No TTL): dependency/source change → `Status: Outdated — superseded by <new> (archived)` block. Full replace → move original to `archive/YYYY-MM-DD/<path>`, never delete.
- Pattern Harvest: log.md 2+ repeats → scan:skills candidate (proposal-first).

- **Drift** — `Vault-Base: git:<hash>` + `Tracked: <paths>`를 `index.md`/`wiki/`에 기록, `git diff --name-only <hash> -- <paths>`로 0-token check (0.01s). If empty → fresh (변경 없음)
- **GC (event-based, No TTL)** — 시간 기반 삭제 금지. dependency/source change 발생 시 `Status: Outdated — superseded by <new> (archived)` 블록 삽입. Full replace 필요 시 원본을 `archive/YYYY-MM-DD/<path>`로 이동, never delete
- **Pattern Harvest** — `log.md`에 2+ repeats(동일 이슈 2회 이상) → `scan:skills` 후보로 제안 (proposal-first, 자동 생성 금지)

## Preflight (태그 전 필수)

```bash
npm run lint
npm run check:vault --strict
npm test
npm pack --dry-run 2>&1 | grep -q "__pycache__" && exit 1 || echo "clean"
```
실패 시 태그 금지. release-guardian 5-step (version/tag sync, pack hygiene, fetch-depth, forbidden pattern) 일반화 계승.

- `npm run lint` — syntax (`opencode.json` JSON + `node --check`)
- `npm run check:vault --strict` — 증거 기계 검증 (3-tier)
- `npm test` — 프로젝트 테스트
- `npm pack --dry-run` — `__pycache__` 누출 차단
- 위 모두 실패 시 태그 금지. release-guardian 5-step 패턴을 하네스 네이티브로 일반화 계승.

## Hard rules

- No guessing, official docs only — interpreter without evidence is blocked here.
- Skills never inside `mcp/` (하네스 소유 분리)
- Proposal-first for new skill
- **Enforcement**: 프롬프트가 아니라 게이트. 세션이 길어 `AGENTS.md`를 잊어도 `verify`가 기계로 다시 강제.

## Why model-agnostic

`CLAUDE.md`에만 가드를 쓰면 `Opus` 전용이 된다. `AGENTS.md`에 쓰면 `Opus`/`GPT`/`Qwen`/`Spark` 모두가 같은 게이트를 통과 — 모델 교체 시 가드 유지. 이것이 얇은 하네스의 핵심.
