---
name: reviewer
description: >
  Semantic review beyond mechanical verify — forest-view cold-start, 0-3 advisory findings.
  Use when tiered-verify is FULL (Plan stage 필수 + Final DIFF 필수) or manual trigger heavy/설계/리팩터.
  Advisory non-blocking; does NOT replace npm run verify.
---

# Reviewer — semantic gate before/after build (advisory, 0-3)

`verify`는 기계적 게이트(lint/vault/test/version/pack)다. `reviewer`는 그 **이전/이후 의미 게이트**다 — 같은 저가 모델이라도 프롬프트 샤프닝으로 contract/data/zombie/scope 결함을 verify 전에 잡는다. Phase 1-A는 스킬 모드(prompt-only)이며, 별도 모델 바인딩은 없다.

## Trigger — tiered-verify.js를 따른다 (코드 판정)

- **SKIPPED / QUICK → Review OFF** — mechanical verify 생략/빠른 경로이므로 semantic review 생략. Echo에 `Review: OFF (tier SKIPPED|QUICK — <reason>)` 1줄 기록.
- **FULL → Review ON** — 두 시점 필수, 각 0-3건 advisory:
  1) **PLAN stage** — 설계/스펙 확정 직후, 코드 작성 전 (interface contract, scope 오염, OSS first 선제 차단)
  2) **Final DIFF** — `git diff HEAD` 전체 + 구현 완료 후, `npm run verify` 호출 전 (zombie 잔재, data 미오픈, 상한/오류격리 최종 점검)
- **Manual override ON** — tier가 QUICK/SKIPPED여도 Task 프롬프트에 `heavy`/`설계`/`리팩터`/`architecture` 키워드가 있으면 Review ON (사용자 명시적 요청으로 간주).
- Echo 요약 형식: `Tier: FULL|QUICK|SKIPPED — <reason> | Review: ON|OFF (<why>)` — tier와 review를 같은 줄에서 가시화.

> Phase 1-A 실행: conductor → `Task(subagent_type="interpreter", skill:reviewer, gate:echo-confirmed)` 별도 호출. 매 verify마다 자동 실행 아님, FULL의 Plan/Final 두 지점에서만 호출.

## Inputs (cap — cold-start forest-view)

Cap 초과 시 잘라내고, 잘라낸 사실을 finding evidence에 명시. 절대 상상 금지.

1. **AGENTS.md** — 헌법 (stable prefix)
2. **index.md** — vault 카탈로그 (1줄/페이지)
3. **get_context 5** — `config-scanner_get_context` intent-ranked wiki/raw 최대 5파일 (~4000자/파일) — AGENTS.md 선두는 이미 있으므로 중복 제외
4. **git diff HEAD** — 전체 DIFF (Final 리뷰) 또는 PLAN 문서/스펙 DIFF (Plan 리뷰) — `git diff HEAD --numstat` + `git diff HEAD -U3` 최소
5. **log.md 5** — 최근 5개 decision 블록 (맥락 오염·재발 패턴 탐지)
6. **Code vs Data 3-file (MANDATORY)** — 이번 Task가 다루는 실제 데이터 파일(JSON/MD/params/config/raw/*.md 등)을 **코드와 별개로 직접 open**하여 3개 이상 확인. 코드에서 `readFile("data.json")`이면 data.json을 실제로 읽어 필드·스키마를 대조. 미오픈 시 `data` 타입 finding으로 즉시 보고 (저가 모델 환각 1차 차단).

> 4-anchor cold-start 앵커: ① AGENTS.md(헌법) ② index.md(지도) ③ git diff(변경 숲) ④ log.md(get_context 포함 최근 결정) — 이 4개면 숲을 보고 나무를 찍는다. GEMINI.md forest-view 이식.

## Checklist — 반드시 전 항목 체크 (pass/fail/NA 기록)

각 항목은 `✓ pass | ✗ fail→finding | NA` 로 표기하고, fail은 Output finding으로 승격. 0건이면 `No findings — checklist all pass` 명시.

- [ ] **4-anchor cold-start** — 위 4앵커를 실제로 읽었는가? (읽지 않고 추측한 항목은 fail)
- [ ] **Code vs Data 3-file opened?** — 코드가 다루는 데이터 파일 3개를 실제로 open했는가? 필드명·타입·샘플 값을 코드와 대조했는가? (예: JSON key 오타, MD frontmatter 누락, params 범위 불일치) — **MANDATORY, 생략 시 data/high finding 강제**
- [ ] **Interface contract** — 함수/모듈 경계, 입출력 스키마, 에러 반환, 호출자 기대가 문서·코드·테스트에서 일치하는가? (타입 불일치, optional 누락, throw vs return 혼선)
- [ ] **Zombie 잔재** — 삭제/이동 예정 코드·파일·import·설정·주석 처리된 dead code가 DIFF/트리 전체에 잔존하는가? (import 미제거, 구 경로 re-export, .gitignore 누락)
- [ ] **Scope 오염** — 이번 Task 범위 밖 파일/기능이 DIFF에 섞였는가? (관련 없는 리팩터, 포맷 전역 변경, 별도 이슈 수정) — 1-responsibility 위반
- [ ] **상한/오류격리 (safety)** — 루프·재귀·큐·재시도에 상한(bound)이 있는가? 외부 I/O·파싱 실패 시 격리·폴백이 있는가? (무한 루프, OOM, silent swallow)
- [ ] **OSS first (stdlib-only exception)** — 신규 유틸이 stdlib/기존 의존성으로 해결 가능한데 새로 구현/의존성 추가했는가? (단, stdlib-only로 충분하면 외부 OSS 강제 아님 — stdlib 우선)

## Output format — 0-3 findings, advisory non-blocking

```json
{
  "review": "ON|OFF",
  "tier": "FULL|QUICK|SKIPPED",
  "reason": "tiered-verify reason + review ON/OFF why",
  "checklist": "4-anchor/data/contract/zombie/scope/safety/oss 각 pass|fail|NA 1줄",
  "findings": [
    {
      "severity": "high|medium|low",
      "type": "design|contract|data|zombie|scope|safety|oss",
      "evidence": "file:line 또는 file#section (실측 경로, 추측 금지)",
      "suggestion": "구체적 수정안 1줄 (파일·코드 스니펫 포함)",
      "blocking": false
    }
  ],
  "summary": "0-3건 요약 1-2줄, 0건이면 'No findings — ...' "
}
```

- **0-3 하드캡** — 4건 이상이면 우선순위(high>medium>low, contract/data/zombie 우선)로 상위 3건만 남기고 나머지는 `deferred: N건 — low 우선순위 생략` 으로 표기.
- **blocking:false 고정** — Phase 1-A는 advisory (non-blocking). verify를 대체하지 않는다.
- **evidence 필수** — file:line이 없으면 finding 무효. "일반적 우려"는 finding으로 불가, checklist 코멘트로만.

## Traceability — advisory drift 방지 (Lock 게이트)

- Reviewer가 **high/medium** finding을 1건이라도 내면, worker(interpreter)는 Lock 전 Task 응답/diary에 **반영/기각 1줄씩**을 반드시 남겨야 한다:
  - 반영: `REVIEW-APPLIED: <finding type> — <file:line> 반영 완료 (commit DIFF 요약 1줄)`
  - 기각: `REVIEW-DISMISSED: <finding type> — <file:line> 기각 사유 1줄 (근거: ...)`
- low는 선택(권장: 1줄 코멘트). 이 기록이 없으면 다음 verify가 아닌 **Lock 단계에서 사람/다음 reviewer가 drift로 판정**한다 (Phase 1-A는 프롬프트 규율, Phase 1-B에서 validate-schema.js 기계 게이트로 격상 예정).
- 성공 기준(Q4): FULL 3회 연속에서 verify 이전에 contract|data|zombie|scope 중 1건 이상을 reviewer가 선제 탐지하면 Phase 1-A 성공.

## Model note — Phase 1-A vs 1-B (아키텍처 모순 해소)

- **Phase 1-A (현 단계, skill-mode): prompt-only sharpening** — reviewer는 별도 agent가 아니라 `skills/reviewer/SKILL.md` 스킬이다. 모델은 `opencode.json:small_model` (= conductor/interpreter와 동일 저가/무료 모델)을 그대로 쓴다. 별도 고품질 모델 바인딩은 **불가** — opencode 모델 바인딩은 agent 단위이며(`opencode.json:agent.<name>.model`), 스킬은 agent가 아니기 때문. 외부 시니어 오케스트레이터 지적 Q2 vs Q3 모순 해소.
- **Phase 1-B (별도 PR, breaking): model split** — `opencode.json`에 4번째 agent `reviewer` 추가, `scripts/inventory.js:190 FORBIDDEN`에서 `reviewer` 제거, `AGENTS.md`의 `3 agents` 문구 `3+1`로 개정, `scripts/validate-schema.js`에 traceability 기계 게이트 추가 후, reviewer agent에만 고품질 모델을 바인딩한다. 이 PR에서는 **절대 수행하지 않는다** (thin 3 agents 유지).

## Relation to verify

- Reviewer는 `npm run verify`를 **대체하지 않는다**. verify는 기계적 진실(lint/vault/test/version/pack)이며, reviewer는 그 전후의 의미적 진실(contract/data/zombie/scope/safety)을 본다.
- 순서: `Plan → [Reviewer:Plan] → Build → [Reviewer:Final] → npm run verify(또는 verify:quick/tiered) → Done`
- SKIPPED/QUICK에서는 reviewer OFF — verify도 경량이므로 이중 생략이 맞다. FULL에서만 이중 게이트.

## References

- `scripts/tiered-verify.js` — FULL/QUICK/SKIPPED 코드 판정 SSOT (5단계 fail-closed)
- `skills/interpreter/SKILL.md` Flow 3.5 Tier — Echo에 Tier 1줄 + Review ON/OFF 1줄
- `skills/verify/SKILL.md` — mechanical gates (lint/vault/test/version/pack)
- `raw/notes/v3-charter.md` — 소유자 헌장 (투명래퍼·Echo·위임 철학)
- GEMINI.md forest-view 패턴 — cold-start 4-anchor + 상한/오류격리 + OSS first
