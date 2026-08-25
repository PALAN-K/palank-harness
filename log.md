# Log — append-only audit ledger

## [2026-08-25] rebuild | v2 → v3 clean rebuild (Echo-first interpreter)
- v2 HEAD 보존: b14f1bbcfd574590a6cd13b5b662fa3e994bca2e — _archive는 게이트 통과 후 삭제(git이 곧 아카이브).
- 결정 1: Echo 게이트 신설 — 위임 작업 전 일상어 요약 확인 강제, `echo.confirmed !== true`면 Lock 불가(타입+코드 강제).
- 결정 2: confidence 폐기 → 결정론 필수 필드 체크리스트(intent/scope-files/done, 누락만 질문, max 1라운드).
- 결정 3: startup inventory 실코드화(scripts/inventory.js, 24h 캐시), hashline/worktree 비핵심 제외 — 필요 시 git b14f1bb 회수.

## [2026-08-25] feat | v3.1 — cache placement protocol, echo gate enforcement
- 결정 4: Cache Economics 3원칙 — stable prefix(헌법 세션 중 불변·휘발성은 prefix 뒤 배치) / late compaction(임계 도달 시에만) / delegation=isolation(강제 위임의 경제학적 근거). 이식 출처: Aider caching(--cache-prompts), OpenHands condenser(임계 시에만 condense). 근거: raw/notes/cache-economics.md → wiki/concepts/cache-placement.md.
- 결정 5: Echo 게이트 코드 집행 — 모든 Task 프롬프트에 `gate:echo-confirmed` | `gate:research-exempt` 선언 필수, 미선언 차단(fail-closed; Goose PreToolUse는 fail-open, 우리는 반대). plugins/force-delegation.js `taskGateOk` export + tests/echo-gate.test.js.
- 결정 6: Interview 형식 이식(Spec Kit clarify) — 질문 ≤5 하드캡, 옵션 2~4 + Recommended 최상단(한 줄 이유), "yes" 한 글자 전체 수락, 선정 우선순위 Impact × Uncertainty. 트리거 결정론·confidence 금지 유지.
- 결정 7: MCP behavior hints(basic-memory 패턴) — search_wiki/get_context readOnlyHint, verify_before_tag idempotentHint. get_context AGENTS.md 선두 반환은 기존 구현 그대로 확인됨.
