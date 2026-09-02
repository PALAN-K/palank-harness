---
name: interpreter
description: >
  Echo-first interpreter — diary → Echo → Interview → Lock → optimal opencode call.
  Use when user speaks diary-style, vague, or non-expert request.
  Echo gate is mandatory for delegated work; startup inventory is executable code (npm run inventory).
---

# Interpreter — Echo-first transparent wrapper

사용자는 일기처럼 말한다. 초보자는 스키마를 판단하지 못하지만, **자기 의도의 요약은 판단할 수 있다.**
그래서 v3의 게이트는 confidence 숫자가 아니라 Echo다 — 모델 편차 없이 타입+코드로 강제한다.

## Flow (always)

0. **Mode (diary keyword → mode var, 코드 판정, 질문 아님)** — diary 원문에서 키워드 매핑으로 `mode` 변수를 결정한다. 기본값은 `guardian`. 매핑 테이블(대소문자 무시 — 영어, 한국어는 정확히 일치):
    - `guardian` (no keyword) — 키워드 없으면 기본값. Echo 대기 + Interview 수행 + 사용자 승인 없이는 위임 불가.
    - `pilot` — keywords: `pilot`, `완료까지`, `성공시까지`, `until completion`, `until success`, `auto verify` 중 하나라도 diary에 포함되면 `mode=pilot`. 예: "작업 완료까지 진행해", "파일럿 모드로 성공시까지", "pilot auto verify".
    - `kamikaze` — keywords: `kamikaze`, `oneshot`, `no verify` 중 하나라도 포함되면 `mode=kamikaze` (pilot보다 우선순위 높음 — 두 키워드가 동시에 있으면 kamikaze가 이긴다).
    Mode는 이후 모든 단계(Echo/Interview/Snapshot/Review/Verify)의 분기 조건이다. Echo 요약에 `Mode: guardian|pilot|kamikaze (<matched keyword or default>)` 1줄을 포함한다. `mode`는 Lock 스키마의 optional 필드로 전달 (`mode?: "guardian"|"pilot"|"kamikaze"`, default guardian, backward compat).
1. **Listen** — 원문 캡처, 추측 금지.
2. **Echo (조건부 — mode에 따라 분기, 위임 작업이면 항상 요약은 보인다)**
    - `guardian` (기본): 일상어로 요약 제시: "작업은 X, 범위는 Y, 결과물은 Z. 맞는가?" **사용자 "yes" 승인 대기 필수**. 승인 전에는 Lock/위임 불가. `echo:{summary, confirmed:true}` — 확인 획득 후 모든 Task 프롬프트에 `gate:echo-confirmed` 선언 필수 (v3.1 코드 강제 — plugins/force-delegation.js가 미선언 Task를 차단, fail-closed). 조사성 질의(research-only)는 면제 — 해당 Task는 `gate:research-exempt` 선언. 사용자가 정정하면 반영 후 재요약 1회.
    - `pilot`: Echo 요약은 **보이되 승인을 기다리지 않는다**(auto-confirmed). 메시지 예: "🟡 pilot — 작업은 X, 범위는 Y, 결과물은 Z. (auto-confirmed, 대기 없음, 완료까지 자동 진행)". 스키마는 `echo:{summary, confirmed:true, auto:true}` 로 합성된다 — `confirmed:true`는 코드 레벨에서 동일하게 검증되므로 validate-schema.js는 이를 유효로 인정한다. Task 마커는 동일하게 `gate:echo-confirmed` (auto는 감사 hint).
    - `kamikaze`: Echo 요약 + **강한 경고**를 함께 보인다. 메시지 예: "🔴 kamikaze — 작업은 X, 범위는 Y. ⚠️ snapshot 후 즉시 진행, verify 생략, 되돌리기는 git stash/branch로만 가능. 진행하는가? (키워드로 이미 opt-in 되었으므로 경고만 표시, 대기는 pilot과 동일하게 생략)". 스키마는 pilot과 동일 `echo:{summary, confirmed:true, auto:true}` + `mode:kamikaze`.
3. **Interview (조건부, 결정론)** — 필수 필드 체크리스트 `{intent, scope/files, done 조건}` 중 **누락된 것만** 질문. 형식(Spec Kit clarify 이식): 질문 **최대 5개 하드캡** / 각 질문은 **2~4개 옵션 + Recommended를 최상단에 한 줄 이유와 함께** 제시 / 사용자는 **"yes" 한 글자로 전체 추천안 수락 가능** 또는 개별 답변 / 질문 선정 우선순위 = **Impact × Uncertainty 스캔**. 배치 2-5, **max 1라운드**. confidence 숫자는 어디에도 등장 금지.
    - `guardian`: 위 규칙 그대로 수행 — 누락 필드가 있으면 Interview 라운드 1회 진행.
    - `pilot` / `kamikaze`: **Interview 생략**(skip) — 누락 필드는 합리적 기본값으로 채운다 (intent는 diary 요약, scope/files는 Tier가 재추정, done은 `npm run verify` PASS로 간주). 시간을 끌지 않고 Plan으로 직행. 필요하면 Plan 문서에 가정(assumption)을 명시한다.
3.5 **Tier (코드 판정, 질문 아님)** — `node scripts/tiered-verify.js --check`로 FULL/QUICK/SKIPPED 3단계를 코드로 판정. 질문으로 묻지 않음. Echo 요약에 `Tier: FULL|QUICK|SKIPPED — <reason>` 1줄을 포함해 사용자가 티어를 눈으로 확인. 판정식은 Fail-Closed 5단계(Blacklist/untracked > 파일수2 > 라인10(11-30 .md만 QUICK) > .md외부 > raw/README≤5 SKIPPED, wiki는 QUICK 격상, H1 버전토큰 터치 시 무조건 FULL). SKIPPED는 증거 JSON(stdout 1줄 + sidecar `.verify-tier.json`) 필수, 증거 없으면 exit 2 차단.
3.6 **Review (advisory, tier+mode 연동)** — `skills/reviewer/SKILL.md` 참조. Tier=FULL이면 Review ON(Plan+Final 각 0-3건, advisory non-blocking), QUICK/SKIPPED면 OFF. Echo에 `Review: ON|OFF (<why>)` 1줄 병기. 키워드 `heavy|설계|리팩터` 수동 override 시 FULL과 동일하게 ON. Phase 1-A는 skill-mode(prompt-only, 동일 모델)로 별도 Task 호출 — `gate:echo-confirmed` 유지. **mode별 Review 분기:**
    - `guardian`: Tier 규칙 그대로 — FULL이면 Plan+Final 둘 다, QUICK/SKIPPED면 OFF. (질문 없이 코드로만 판정)
    - `pilot`: FULL이면 Plan+Final 둘 다 (guardian과 동일), **QUICK이면 Final만 1회**(Plan 생략, 최종 DIFF는 의미 게이트로 본다), SKIPPED면 OFF. auto 진행이지만 의미 게이트는 최소 한 번은 본다.
    - `kamikaze`: **Review OFF 고정** — snapshot 이후 즉시 build, Plan/Final 모두 생략 (경고에 명시). 필요하면 사후에 수동 reviewer 호출은 가능하지만 자동 경로에서는 생략.
3.7 **Snapshot (pilot/kamikaze 전용, guardian 생략)** — Dispatch 직전에 **되돌릴 수 있는 지점**을 만든다. 파일 쓰기 전에 한 번만 수행:
    - `git stash push -m "pre-pilot-<YYYYMMDD-HHMMSS>-<short-summary>"` 또는 (stash가 막힌 환경이면) `git branch pilot/<timestamp>` 로 분기 생성. 둘 다 **로컬 전용, 원격 push 없음**. stash/branch 이름은 Echo summary의 첫 20자를 slug화하여 추적 가능하게 한다.
    - snapshot 실패 시(at git error) — 경고 로그를 남기고 진행하되, pilot의 auto-rollback은 비활성화되고 Fix-retry로만 대응한다. 성공 시에는 verify 실패 시 rollback에 사용한다.
4. **Lock** — 스키마 `{intent, files, schema, opencode_call, model, mcp, echo:{summary, confirmed}, mode?: "guardian"|"pilot"|"kamikaze"}`. `echo.confirmed !== true`면 Lock 불가(타입 수준 거부). **dispatch 전 검증기 실행 필수**: `node scripts/validate-schema.js '<json>'` (stdlib 검증기, exit 0=유효) — 무효 스키마는 dispatch 단계로 진행 불가. v3.2부터 이 거부는 문장이 아니라 실코드다. `mode`는 optional이며 생략 시 `guardian`으로 간주(backward compat). `echo.auto:true`는 `mode:pilot|kamikaze`일 때만 허용되며, `confirmed:true`와 함께 있어야 유효하다(pilot synthetic echo.confirmed).
5. **Classify** — `research|brainstorm` vs `build|fix|migrate|review`.
6. **Read (build 계열만)** — 3-layer: AGENTS.md(헌법) → index.md(카탈로그) → wiki/raw (MCP get_context, 5파일 제한).
7. **Translate** — 스키마 완성.
8. **Dispatch** — 3-tier: `opencode run --agent verify`(단발) / `opencode session`(장문맥) / `opencode mcp`(도메인 툴). 모든 Task 프롬프트는 게이트 마커 필수: 확인된 위임은 `gate:echo-confirmed`, 조사 전용은 `gate:research-exempt` (미선언 시 플러그인이 차단 — fail-closed, Goose PreToolUse 패턴의 반대 설계). 정적 매핑 테이블 금지 — 매 실행 inventory 기반 LLM 선택. **mode에 따라 dispatch 메시지를 달리한다** — `guardian`은 "승인된 plan으로 build 위임", `pilot`은 "auto 스냅샷 후 build 위임 (되돌리기: git stash pop / git branch pilot/...) ", `kamikaze`는 "snapshot 후 즉시 build (no verify warnings)".
9. **Verify (build 계열만, mode별 분기)**
    - `guardian` (기본): FULL이면 Reviewer(Final) → verify 스킬 순으로 위임, QUICK/SKIPPED는 Review OFF 후 verify 경량 경로. research는 검증 없이 종료. 사용자는 각 단계에서 승인/반려한다.
    - `pilot` — **자동 verify loop (승인 없이 완료까지)**: `node scripts/tiered-verify.js --check` 로 Tier를 코드 판정 → Tier별 verify를 **자동**으로 수행(승인 대기 없음, 호출 자체가 자동):
      - SKIPPED → heavy verify 생략 허용(증거 JSON 확인으로 종료).
      - QUICK → `npm run verify:quick` (lint+vault+test) 자동 수행.
      - FULL → `npm run verify` 전체(lint+vault+test+version+pack) 자동 수행.
      결과 처리:
      - PASS → 자동 커밋: 메시지 `"Done, auto verify passed Tier:<TIER> — <Echo summary>"` (Tier 값을 명시). 이후 사용자에게 완료 보고.
      - FAIL → **auto rollback 또는 fix-retry**: 1) snapshot이 있으면 `git stash pop` 또는 `git reset --hard HEAD`로 되돌리기 제안(자동 rollback은 pilot에서 1회만 수행), 2) 실패 원인이 코드 수정으로 해결 가능하면 **최대 3회까지** fix-retry 루프(같은 Task 내에서 재시도, 매 회 Tier 재측정). 3회 초과 또는 snapshot 없음이면 Handoff — 사용자에게 "3회 재시도 후에도 verify FAIL — 수동 개입 필요 (git stash list / pilot branch 확인)" 메시지로 핸드오프하고 중단. 무한 루프 금지(retry cap 3, fail-closed).
    - `kamikaze` — **verify 생략(no verify)**: build 직후 바로 Done으로 간주, `npm run verify` 호출 없음. DIFF 요약을 사용자에게 보여주고, "⚠️ kamikaze 모드로 verify 없이 종료 — 필요 시 `npm run verify` 수동 실행 요망. 롤백: `git stash pop` 또는 `git checkout pilot/<ts>`" 경고를 반드시 병기. Tier 측정도 생략 가능(의미 게이트 완전 생략). snapshot은 pilot과 동일하게 수행하므로 되돌리기는 가능하다.

## Modes — guardian / pilot / kamikaze (MVP 상세)

> Thin 유지 원칙: AGENTS.md / opencode.json / scripts/inventory.js / plugins/force-delegation.js 는 수정하지 않는다. 3 agents( conductor / interpreter / verify ) 유지, .opencode/agent/*.md 생성 금지. 이 스킬 문서와 validate-schema.js 2개 파일만으로 3모드를 구현 — 추후 snapshot.js 등 신규 스크립트는 별도 PR.

| 모드 | 이모지 | 키워드(대소문자 무시, diary에 하나라도 있으면 해당 모드) | Echo/승인 | Interview | Snapshot | Review | Verify | 용도 |
|------|--------|----------------------------------------------------------|-----------|-----------|----------|--------|--------|------|
| guardian | 🟢 | (no keyword) — 기본값 | 요약 후 **"yes" 대기** | 누락 필드만 2-5Q 1라운드 | 없음 | Tier 규칙대로: FULL→Plan+Final, QUICK/SKIPPED OFF | Tier별 verify 위임, 단계별 승인 | 계획 수립 → 검토 → 승인 → 실행 — 안전 기본값 |
| pilot | 🟡 | pilot, 완료까지, 성공시까지, until completion, until success, auto verify | 요약 **auto-confirmed** (`echo.confirmed:true auto:true`, 대기 없음) | **생략**(defaults) | `git stash push -m "pre-pilot-..."` 또는 `git branch pilot/<ts>` | FULL→Plan+Final, QUICK→Final만, SKIPPED OFF | **auto verify**: tiered-verify --check → npm run verify 계열 자동, PASS→"Done, auto verify passed Tier:X" 커밋, FAIL→rollback/fix-retry max 3 → handoff | "작업 완료까지 진행해" — Plan이 완벽하면 승인 없이 verify까지 자동 |
| kamikaze | 🔴 | kamikaze, oneshot, no verify | 요약 + **경고** auto-confirmed | 생략 | pilot과 동일 snapshot | **OFF 고정** | **없음**(no verify), 사후 수동 verify 권장 | 원샷 실험 — verify 없이 즉시 종료, 되돌리기는 snapshot으로만 |

### 메시지 규약 (TF per mode)

- **guardian TF**: `🟢 guardian — 작업은 X, 범위는 Y, 결과물은 Z. 맞는가? (yes로 승인)` / Interview 질문 2-5개 + Recommended 최상단 / `Tier: ... | Review: ON|OFF | Mode: guardian` / Lock 후 `gate:echo-confirmed`로 Dispatch / Verify는 단계별 승인 요청.
- **pilot TF**: `🟡 pilot — 작업은 X, ... (auto-confirmed, 완료까지 자동, retry cap 3, rollback 가능)` / Interview 생략 메시지: "Interview skipped (pilot defaults)" / `Mode: pilot (keyword: 완료까지) | Tier: ... | Review: ... | Snapshot: git stash push ...` / Dispatch: `pilot auto — gate:echo-confirmed` / Verify loop 자동: `tiered-verify --check → npm run verify[:quick]` → PASS `"Done, auto verify passed Tier:FULL"` 커밋 / FAIL → `rollback / retry 1/3 ...` → 3회 초과 시 Handoff.
- **kamikaze TF**: `🔴 kamikaze — 작업은 X ... ⚠️ snapshot 후 즉시 진행, no verify, 리뷰 없음. 되돌리기: git stash pop` / Interview/Review 모두 skipped 로그 / Verify 생략 메시지: `kamikaze no verify — Done (manual verify recommended)`.

### 사용 예 (End-to-end)

1) 사용자가 `"계획을 수립해줘 — auth 리팩터"` → **guardian**: Echo 요약 + yes 대기 → Interview(누락 필드) → Plan 문서 생성 → Reviewer:Plan (FULL이면) → 사용자 검토 → 사용자가 plan이 완벽하다고 판단하면 `"작업 완료까지 진행해"` 라고 말한다.
2) `"작업 완료까지 진행해"` → **pilot**: Mode=pilot (키워드 `완료까지` 매치) → Echo auto-confirmed (대기 없음) → Interview 생략 → Tier 코드 판정 → snapshot(`git stash push -m "pre-pilot-...auth"`) → Reviewer 처리는 Tier에 따라(FULL이면 Plan+Final, QUICK이면 Final만) → Dispatch build → tiered-verify 자동 → `npm run verify` 또는 `verify:quick` 자동 → PASS면 `"Done, auto verify passed Tier:FULL"` 커밋 후 완료 보고, FAIL이면 최대 3회 fix-retry 후에도 실패하면 `git stash pop` 롤백과 함께 핸드오프.
3) `"kamikaze로 한 번에 끝내줘"` → **kamikaze**: Mode=kamikaze → Echo+경고 auto → snapshot → Review OFF → build → verify 없이 Done, 롤백 방법 안내.

## Startup Inventory — 실행 코드 (매 실행)

- `npm run inventory` → `.opencode-inventory.json` 캐시(24h 유효) → available agents/tools 주입.
- 수집원: `opencode debug skill/config` + command/agent/skill 디렉터리 glob — 파싱 실패 허용(best-effort).
- ❌ 정적 매핑 테이블 금지: 신형 커맨드 추가 시 즉시 구식이 되고 프로젝트별 커스텀 커맨드를 반영 못 한다.
- ✅ 매 실행 최신 조회: 인벤토리가 바뀌면 LLM의 선택도 자동으로 바뀐다 — 투명래퍼의 핵심.

## Hard rules

- Never pass raw diary to builder — 항상 files+schema+opencode_call+echo(+mode)로 위임.
- Interview는 누락 필드만, optional은 기본값 유지, max 1라운드 — 단 pilot/kamikaze에서는 Interview 자체를 생략한다.
- research-only 조사 질의는 Echo 면제 + 직접 답변(위임 아님).
- mode는 optional 필드이며 생략 시 guardian으로 간주 — thin 3 agents를 깨지 않는다.
- pilot auto-verify는 retry cap 3을 초과하지 않으며, SKIPPED 증거 없이는 exit 2로 차단(fail-closed).
- kamikaze는 verify를 생략하지만 snapshot은 반드시 수행한다 — 되돌릴 수 없는 실행은 없다.

## 게이트 마커의 본질적 한계 (v3.2 명시)

`gate:echo-confirmed` / `gate:research-exempt` 마커는 모델의 **자체선언**이며, 실제 사용자 확인 이벤트와 자동 결합되지 않는다 — 마커를 쓰면 확인이 "있었다"고 주장할 뿐, 그 진위를 시스템이 보증하지 못한다(본질적 한계; 확인 이벤트의 암호적 증명 없한 한 제거 불가). 따라서 현재 강제선은 게이트웨이의 **일관성 검사**까지다: plugins/force-delegation.js가 마커 미선언 Task를 fail-closed로 차단하므로 "선언 없는 위임"은 불가능하지만, "거짓 선언"은 프롬프트 규율(Rule 4)과 세션 감사 (log.md)에 의존한다. Echo 요약은 항상 사용자 눈에 보이는 메시지로 제시된다 — 위조 여부의 1차 검증자는 사용자다. **pilot/kamikaze의 auto-confirmed는 사용자가 diary에 `완료까지`/`pilot`/`kamikaze` 키워드로 명시적 opt-in 했을 때만 합성되며, 일반 guardian 경로의 "yes" 대기를 우회하지 않는다.**

## References

- 근거: `raw/notes/v3-charter.md`(소유자 헌장), `wiki/concepts/echo-first-interpreter.md`.
- Inventory 구현: `scripts/inventory.js` — prose 스펙 폐기, 코드가 SSOT.
- Reviewer: `skills/reviewer/SKILL.md` — FULL tier Plan+Final 0-3 advisory, Code vs Data 3-file 필수.
- Verify: `skills/verify/SKILL.md` + `scripts/tiered-verify.js` — Fail-Closed 3단계(Tier) + pilot auto verify loop.
- Validator: `scripts/validate-schema.js` — Lock 게이트, `mode` optional enum + `echo.auto` 허용(후술).
- v2 flow 참고 필요 시: `git show b14f1bb:_archive/skills/interpreter/SKILL.md`.
