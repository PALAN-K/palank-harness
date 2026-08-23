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

## Thin vs Domain 구분표

> 하네스는 disposable(스캐폴드), wiki는 spec(자산). MCP도 Thin(하네스 공용)과 Domain(프로젝트 전용)으로 분리.

| 구분 | Thin (하네스 SSOT) | Domain (프로젝트 전용) |
|------|-------------------|------------------------|
| 파일 | `mcp/server.js` | `api/mcp.ts` (예: leak-whisperer) |
| 전송 | stdio | HTTP (Vercel Serverless) |
| 툴 수 | 3 (`search_wiki`, `get_context`, `verify_before_tag`) | 15+ (도메인 비즈니스 툴 + `get_leak_constants` wiki proxy) |
| 등록 | `opencode.json:mcp.palank-domain` | `opencode.json:mcp.jipkkumida-domain` |
| 타입 | `type: "local"` + `command: ["node","mcp/server.js"]` | `type: "remote"` + `url: "https://your-domain/api/mcp"` |
| 실행 | `node mcp/server.js` / `npm run mcp:dev` | `vercel dev` (API 동작) vs `vite dev` (프론트만, api/*.ts 미실행) — wiki ENOENT는 prod/Vercel에서만 발생 |

**타입 열거 (opencode.json:mcp.<name>.type)**

- `local`: `{ "type":"local", "command":["node","mcp/server.js"], "enabled":true }` — stdio, 하네스 Thin (로컬 프로세스)
- `remote`: `{ "type":"remote", "url":"https://your-domain/api/mcp", "enabled":true }` — HTTP, 도메인 (Vercel 배포 후 사용, `vercel dev`로 로컬 테스트)

예시: `templates/opencode.json.template`에 `// Domain HTTP (project-specific): copy to enable` 주석으로 포함. 복사해 `your-domain`을 실제 도메인(`nusoo.org` 등)으로 교체.

**Vercel 번들 경고 (wiki ENOENT 방지)**

`api/mcp.ts`가 `fs.readFileSync('.wiki/wiki/topics/knowledge-base.md')`로 wiki를 읽을 때, `.vercelignore`에 `.wiki/`가 있으면 프로덕션에서 `ENOENT` 발생. 해결: `vercel.json`에 `functions.api/mcp.ts.includeFiles = ".wiki/wiki/topics/**"` 추가. 템플릿: `templates/vercel.json.template` + `templates/.vercelignore.template`의 ⚠️ 주석 참조.

**설치**

```bash
cd mcp && npm i
# opencode.json에 이미 등록됨: "palank-domain": { "type":"local", "command":["node","mcp/server.js"] }
# Domain 원격 예시: "jipkkumida-domain": { "type":"remote", "url":"https://your-domain/api/mcp", "enabled": true }
```

**검증**

```bash
node --check mcp/server.js
# Domain 테스트 (배포 후): curl https://your-domain/api/mcp
```
