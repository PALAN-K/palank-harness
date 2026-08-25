# Echo-first Interpreter

Vault-Base: git:b14f1bbcfd574590a6cd13b5b662fa3e994bca2e

> Raw: raw/notes/v3-charter.md

## 요약

palank-harness v3의 핵심 재설계. 사용자는 일기처럼 말하고, 초보자는 스키마를 판단 못 하지만 자기 의도의 요약은 판단할 수 있다는 관찰에서 출발한다. 따라서 위임 전 게이트를 Echo(일상어 요약 확인)로 고정하고, 모델 성격이 아니라 스키마 타입과 플러그인 코드로 강제한다.

## 원칙 (소유자 6대 철학 요약)

1. 투명래퍼 인터프리터 — 오픈코드 하네스를 투명래퍼로 감싸 일기→스키마→최적 호출. inventory는 실행 코드.
2. 도메인 지식 보완 — 위키 지식 + 로컬 MCP(사실상 DB).
3. 클래리파이 선행 — 의도를 먼저 구체화한 뒤 스키마 생성. 결정론 체크리스트 사용.
4. Echo 게이트(v3 신규) — 명확한 의도라도 위임 전 요약 제시·확인. 타입+코드 강제.
5. 비핵심 부속물 — 해시라인·워크트리 미포함, git 이력 회수.
6. 강제 위임·컨텍스트 보존 — 서브에이전트 강제 위임 + KV캐시 상주 전제.

## v2 → v3 변경

- Echo 게이트 신설: 위임 작업 전 항상 요약 확인(조사성 질의 면제). 스키마에 `echo:{summary, confirmed:true}` 필수 — 미확인 스키마는 Lock 불가.
- confidence 폐기 → 결정론 체크리스트: 필수 필드(intent/scope-files/done) 중 누락만 배치 질문, max 1라운드.
- startup inventory 실코드화: `scripts/inventory.js` (산문 스펙 폐기, 정적 매핑 금지 유지).
- hashline 완전 제거 — 필요 시 git 이력(b14f1bb)에서 회수.

## 검증법

- `npm run verify` = lint(node --check) + check:vault --strict(Raw 필수·index 패리티·drift) + test + pack --dry-run.
- Echo 강제 검증: interpreter SKILL Flow 4단계 — `echo.confirmed !== true`면 Lock 타입 수준 거부.
- 위임 차단 검증: `npm test` — plugins/force-delegation.js 매처(PowerShell 쓰기 차단, 읽기 허용).

## 참조

- `raw/notes/v3-charter.md` — 소유자 헌장 원문
- `skills/interpreter/SKILL.md` — 9단계 Flow
- `scripts/inventory.js` — startup inventory 구현
- v2 전체: `git show b14f1bb:<path>`
