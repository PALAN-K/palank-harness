# MCP — Palank Domain

**라이브러리**: `@modelcontextprotocol/sdk` — MIT, 표준 MCP SDK. 하네스가 바뀌어도 서버는 재사용된다.

**왜 MCP를 쓰나**: wiki/는 정적 백과사전(하네스 지식), MCP는 살아있는 API(지금 기계에 무엇이 있는가).
모델은 wiki로 추론하고 MCP로 실행.

## Tools (v3 — 모두 실구현)

| Tool | 동작 |
|------|------|
| `search_wiki` | wiki/ + raw/ 재귀 grep(case-insensitive) + index.md 히트 반환 |
| `get_context` | 레이어드 리딩 — AGENTS.md 선두 3000자 + index.md + intent 키워드 겹침 순위로 wiki/raw 최대 5파일(파일당 ~4000자) 반환 |
| `verify_before_tag` | 프로젝트 루트에서 `npm run verify` 스폰(timeout 120s) → `{ok, output_tail}` 반환. 실패 시 태그 금지 |

> v3.1: 전 툴 behavior hints(`annotations`) — 패턴 출처: basic-memory의 전 툴 behavior hint
> (progressive tool discovery — 모델이 툴을 호출해 보기 전에 동작을 알게 해 시행착오 토큰 절약).
> `search_wiki`·`get_context` = `readOnlyHint: true`, `verify_before_tag` = `idempotentHint: true`(소스 미변경 시 동일 게이트 결과).

## 설치·등록·검증

```bash
cd mcp && npm i
# opencode.json에 등록됨: "palank-domain": { "type":"local", "command":["node","mcp/server.js"] }
node --check server.js   # 문법 검증
```

## 프로젝트별 확장

이 `mcp/`를 복사해 도메인 툴을 추가한다 — AGENTS.md가 계약, MCP가 구현:

```js
// mcp/server.js — tools 배열에 추가
{ name: "search_orders", description: "CRM 주문 조회",
  inputSchema: { type: "object", properties: { customer: { type: "string" } }, required: ["customer"] } }
```

- 공용 MCP(결제, 관측성)는 한 번 만들어 모든 하네스에서 재사용.
- 원격 도메인 서버가 필요하면 `opencode.json:mcp.<name>.type: "remote"` + url 사용.
