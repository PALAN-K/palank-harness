# MCP — Palank Domain (stub)

**최적화 라이브러리**: `@modelcontextprotocol/sdk` — MIT, Anthropic이 Linux Foundation에 기부한 표준. `OpenHarness`, `DeepSeek Harness`, `HarnessX`도 동일 베이스라 하네스가 바뀌어도 서버는 재사용됩니다.

**왜 MCP를 쓰나**: wiki/는 정적 백과사전(하네스 지식: 왜 B를 골랐는가), MCP는 살아있는 API(지금 DB에 무엇이 있는가). 모델은 wiki로 추론하고 MCP로 실행.

**프로젝트별 확장**: 이 `mcp/`를 복사해 도메인 툴을 추가하세요.

```js
// mcp/server.js — tools 배열에 추가
{ name: "search_orders", description: "CRM 주문 조회", inputSchema: { type:"object", properties:{ customer:{type:"string"} }, required:["customer"] } }
```

- 공용 MCP(결제, 관측성)는 한 번 만들어 모든 하네스에서 재사용
- 프로젝트 전용 MCP(집꾸미다 도메인)는 이 폴더에 두고 `opencode.json:mcp.palank-domain`으로 등록

**설치**

```bash
cd mcp && npm i
# opencode.json에 이미 등록됨: "palank-domain": { "type":"local", "command":["node","mcp/server.js"] }
```

**검증**

```bash
node --check mcp/server.js
```
