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

## [2026-08-25] fix | v3.2 — P0: revive dead force-delegation guard (official plugin contract)
- **사건 요약 ("green tests, dead guard")**: v3.1 가드가 유닛 테스트 100% 통과에도 런타임에서 단 한 번도 작동하지 않았다. 런타임 프로브(`opencode debug config --print-logs`)가 baseline으로 실측: `level=ERROR message="failed to load plugin" error="on is not a function ... 'on' is undefined"` → 로더가 흡수 → 훅 0개 등록 = Layer 2 사(死)코드.
- **4중 결함**: ①진입 `setup({on})` — PluginInput에 on 없음 ②`on("tool.execute.before",...)` 콜백 등록 — 훅 객체 반환 필요 ③args를 `input.args`에서 읽음 — 실제론 `output.args` ④훅 input은 `{tool, sessionID, callID}`뿐 agent 필드 없음.
- **수정 내역**: plugins/force-delegation.js 전면 재작성 — 공식 계약 `({project,client,$,directory,worktree}) => Promise<Hooks>`, 훅 객체 반환, `output.args` 직독. 에이전트 판별은 SDK 1.18.23 타입 실측으로 [가능] 확정: `client.session.messages({sessionID})` → UserMessage.agent (보조: AssistantMessage.mode) → conductor 전용 풀 가드(write/edit/patch + bash 쓰기 패턴). Task 마커 게이트는 신원 불필요 → **전 에이전트 적용**(P1-4 중첩 우회 차단). 신원 미확정 시 파괴 명령(rm/del/Remove-Item/ri)만 전역 차단(P1-2). 리다이렉트 통합 정규식(공백 없는 >f/>>f/2>f 차단, 2>&1/$null/NUL 면제), heredoc `<<`·PS here-string `@'`/`@"`, PS 별칭 sc/ac/ni/mi 추가.
- **재발 방지선 (P1-8)**: tests/plugin-wiring.test.js 신설 — default export → mock 컨텍스트 호출 → 훅 객체 배선 단언 → mock input/output 구동. 이 테스트가 있었다면 v3.1 사코드를 배포 전에 잡았을 것.
- **기타 P1/P2**: 버전 통일 v3.2(package.json/AGENTS.md H1/README H1), Lock 스키마 검증기 실코드화(scripts/validate-schema.js, stdlib, exit 0/1/2 + 테스트 4건 — P1-6), 마커 자체선언 한계 문서화(skills/interpreter/SKILL.md — P1-5), check_vault 출력 "drift"→"hash reachability"(P1-7), Rule 5 explore 위임 명시 + Cache Economics 제목 "(design guidance, 미실측)" + package.json files에 log.md 추가(P2).
