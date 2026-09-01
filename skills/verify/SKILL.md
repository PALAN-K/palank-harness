---
name: verify
description: >
  Model-agnostic coding guard — scaffold / lint / loop.
  Use when user says "검증", "린트", "배포 전", "완료", "테스트 통과".
  Runs checks itself, never trusts model "tests pass".
---

# Verify — scaffold / lint / loop (model-agnostic)

`interpreter`가 스키마로 바꾸면(echo 확인 포함), 이 스킬이 **기계 검증**을 한다.
모든 티어가 같은 가드 — `AGENTS.md` 얇은 표준.

## Triggers

- `scaffold`, `init`, `스캐폴드` — vault/harness scaffolding
- `lint`, `검증`, `check` — health check
- `loop`, `완료`, `배포 전` — preflight gate

## 1. Scaffold (dual-ledger)

- `raw/` immutable never edit, `wiki/` LLM-owned, `index.md` 1 line/page, `log.md` append-only
- `index.md + log.md` atomic dual-write — 둘 다 갱신 or 둘 다 실패
- `AGENTS.md` 단일 소스, `opencode.json` 라우팅 SSOT, `mcp/`는 도메인별 1개씩 확장, `skills/`는 하네스 소유
- Harness disposable, spec is asset — foundry는 비계, 모델 교체 시에도 스캐폴드 유지

## 2. Lint (3 tiers)

- **Safe fixes** — 기계적으로 고칠 수 있는 것만: `index.md` 줄 수 vs `wiki/**/*.md` 일치,
  `wiki → raw/` 링크 존재 여부 — 자동 수정 가능
- **Mechanical** — `npm run check:vault --strict` (= scripts/check_vault.js --strict):
  모든 wiki 페이지에 `> Raw:` 필수(raw/ 실존 확인), index 패리티, Vault-Base drift 해시 검증.
  빈 볼트(0 pages, 0 rows)는 유효한 PASS 스켈레톤.
- **Judgment** — 모순, 오래된 주장, 고아 페이지 — report only (자동 수정 금지, 사람 판단)
- Hard rule: No guessing, official docs only — evidence 없는 산출물은 여기에서 블럭
- Enforcement는 프롬프트가 아니라 게이트 — 세션이 길어 AGENTS.md를 잊어도 verify가 기계로 재강제.

## 3. Loop (vault lifecycle)

- **GC (event-based, No TTL)** — 시간 기반 삭제 금지. superseded → Status 블록 또는 이동, never delete
- **Pattern Harvest** — 동일 이슈 2회 반복 → skill화 후보 제안 (proposal-first)
- **Loop Guard** — verify 루프 최대 2회 재시도, lint 실패 시 즉시 중단 (무한 루프 방지)
- **Quick Path** — 간단 작업(research/review/문서 1-2줄)은
  `npm run lint && npm run check:vault --strict` 통과로 verify 갈음 —
  KV 캐시 유지(AGENTS.md 상주 히트), 오리지널 컨텍스트 보존

## 3.5 Tiered Verify — Fail-Closed 3단계 (코드 판정)

`scripts/tiered-verify.js`가 **코드**로 판정 — 질문 아님, 프롬프트 우회 불가.

- **FULL** — 코어/설정/스크립트/스킬(Blacklist) hit, untracked 존재, 파일수>2, 라인>30, 비-.md 포함, H1 버전토큰 터치 → `npm run verify` 전체 게이트(lint+vault+test+version+pack) 필수. `tiered-verify --check` exit 1.
- **QUICK** — `.md`만 1-2파일, ≤30줄, 11-30줄은 .md만 허용, 단일 wiki ≤5줄 포함 → `npm run verify:quick` (lint+vault+test) 으로 갈음. exit 1 이지만 quick 경로로 위임. 코드는 `scripts/tiered-verify.js`의 `evaluateTier()` 참조.
- **SKIPPED** — `raw/` 또는 `README.md` body 단일 파일 ≤5줄, H1 미터치, Blacklist/untracked/file수/확장자 모두 통과 → 증거 JSON(stdout 1줄) + sidecar `.verify-tier.json` 생성 후 heavy verify 생략 허용. exit 0. 증거 없는 SKIPPED 시도는 exit 2로 차단(fail-closed).

판정 5단계(우선순위): 1 Blacklist/untracked → 2 파일수>2 → 3 라인수>10(11-30 .md만 QUICK) → 4 .md외부 → 5 단일파일≤5 raw/README SKIPPED, wiki QUICK. 모든 단계는 `getGitState()`에서 `git status --porcelain`을 **최우선**으로 호출해 untracked 맹점을 차단하고, staged/unstaged 합산(`git diff HEAD --numstat`), H1 토큰은 `git diff HEAD`에서 `/^\+#.*v\d+\.\d+/` 로 감지.

증거 스키마: `{tier, reason, evidence:{files, totalLines, untracked, blacklisted, timestamp, gitHead}}` — SKIPPED 시 `trivial:{tier,reason,evidence}`로 Lock 스키마에도 첨부 가능(validate-schema.js 검증).

## Preflight (태그 전 필수)

```bash
npm run lint
npm run check:vault --strict
npm test
npm pack --dry-run
```

실패 시 태그 금지.

## Hard rules

- No guessing, official docs only.
- Skills never inside `mcp/` (하네스 소유 분리). Proposal-first for new skill.
- Enforcement는 게이트 — 프롬프트를 무시해도 모델 불문 블럭.

## Why model-agnostic

특정 모델에만 가드를 쓰면 모델 전용이 되어 교체 시 무너진다. 타입과 코드(스크립트+게이트)로
강제하면 모든 티어가 같은 게이트를 통과한다 — 이것이 얇은 하네스의 핵심.

## History

v2 verify(72줄)에서 hashline 섹션·archive 포인터를 제거하고 게이트만 남긴 v3 포트.
v2 원문 필요 시 `git show b14f1bb:_archive/skills/verify/SKILL.md`.
