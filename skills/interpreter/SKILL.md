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

1. **Listen** — 원문 캡처, 추측 금지.
2. **Echo (위임 작업이면 항상)** — 일상어로 요약 제시: "작업은 X, 범위는 Y, 결과물은 Z. 맞는가?"
   확인 획득 후 **모든 Task 프롬프트에 `gate:echo-confirmed` 선언 필수**(v3.1 코드 강제 —
   plugins/force-delegation.js가 미선언 Task를 차단, fail-closed).
   조사성 질의(research-only)는 면제 — 해당 Task는 `gate:research-exempt` 선언.
   사용자가 정정하면 반영 후 재요약 1회.
3. **Interview (조건부, 결정론)** — 필수 필드 체크리스트 `{intent, scope/files, done 조건}` 중
   **누락된 것만** 질문. 형식(Spec Kit clarify 이식):
   질문 **최대 5개 하드캡** / 각 질문은 **2~4개 옵션 + Recommended를 최상단에 한 줄 이유와 함께** 제시 /
   사용자는 **"yes" 한 글자로 전체 추천안 수락 가능** 또는 개별 답변 /
   질문 선정 우선순위 = **Impact × Uncertainty 스캔**.
   배치 2-5, **max 1라운드**. confidence 숫자는 어디에도 등장 금지.
4. **Lock** — 스키마 `{intent, files, schema, opencode_call, model, mcp, echo:{summary, confirmed}}`.
   `echo.confirmed !== true`면 Lock 불가(타입 수준 거부).
5. **Classify** — `research|brainstorm` vs `build|fix|migrate|review`.
6. **Read (build 계열만)** — 3-layer: AGENTS.md(헌법) → index.md(카탈로그) → wiki/raw
   (MCP get_context, 5파일 제한).
7. **Translate** — 스키마 완성.
8. **Dispatch** — 3-tier: `opencode run --agent verify`(단발) / `opencode session`(장문맥) /
   `opencode mcp`(도메인 툴). 모든 Task 프롬프트는 게이트 마커 필수:
   확인된 위임은 `gate:echo-confirmed`, 조사 전용은 `gate:research-exempt`
   (미선언 시 플러그인이 차단 — fail-closed, Goose PreToolUse 패턴의 반대 설계).
   정적 매핑 테이블 금지 — 매 실행 inventory 기반 LLM 선택.
9. **Verify (build 계열만)** — verify 스킬에 위임. research는 검증 없이 종료.

## Startup Inventory — 실행 코드 (매 실행)

- `npm run inventory` → `.opencode-inventory.json` 캐시(24h 유효) → available agents/tools 주입.
- 수집원: `opencode debug skill/config` + command/agent/skill 디렉터리 glob — 파싱 실패 허용(best-effort).
- ❌ 정적 매핑 테이블 금지: 신형 커맨드 추가 시 즉시 구식이 되고 프로젝트별 커스텀 커맨드를 반영 못 한다.
- ✅ 매 실행 최신 조회: 인벤토리가 바뀌면 LLM의 선택도 자동으로 바뀐다 — 투명래퍼의 핵심.

## Hard rules

- Never pass raw diary to builder — 항상 files+schema+opencode_call+echo로 위임.
- Interview는 누락 필드만, optional은 기본값 유지, max 1라운드.
- research-only 조사 질의는 Echo 면제 + 직접 답변(위임 아님).

## References

- 근거: `raw/notes/v3-charter.md`(소유자 헌장), `wiki/concepts/echo-first-interpreter.md`.
- Inventory 구현: `scripts/inventory.js` — prose 스펙 폐기, 코드가 SSOT.
- v2 flow 참고 필요 시: `git show b14f1bb:_archive/skills/interpreter/SKILL.md`.
