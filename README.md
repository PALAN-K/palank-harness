# palank-harness v3 — Echo-first interpreter on opencode

opencode 위에 얹는 투명래퍼 인터프리터 하네스. 사용자가 일기처럼 말해도
**Listen → Echo → Interview → Lock → 최적 opencode 호출**로 해석·위임한다.

핵심 원리(소유자 6대 철학, `raw/notes/v3-charter.md`):
Echo 게이트(위임 전 요약 확인 — 스키마 타입+플러그인 코드로 강제),
결정론 클래리파이(confidence 폐기), 위키+로컬 MCP 지식 보완, 3-layer 강제 위임,
startup inventory 실행 코드화, 해시라인/워크트리 비핵심 제외.

## Commands

```bash
npm run inventory      # startup inventory 수집 (.opencode-inventory.json, 24h 캐시)
npm run verify         # 게이트: lint + check:vault --strict + test + pack --dry-run
npm run lint           # node --check (plugins, scripts, mcp)
npm run check:vault    # 볼트 검증 (--strict)
npm test               # node --test tests/
cd mcp && npm i        # MCP 서버 의존성 설치 (opencode.json에 등록됨)
```

모든 위임 Task 프롬프트는 게이트 마커 필수: `gate:echo-confirmed`(사용자 확인 완료) 또는
`gate:research-exempt`(조사 전용) — 미선언 시 플러그인이 차단(fail-closed).

## v2 회수

v2 전체 스냅샷은 git 이력에 있다(`_archive` 포함, HEAD `b14f1bb`):

```bash
git show b14f1bbcfd574590a6cd13b5b662fa3e994bca2e:<path>
# 예: git show b14f1bb:_archive/scripts/hashline.js
```
