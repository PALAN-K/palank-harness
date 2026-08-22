---
name: interpreter
description: >
  Natural language → schema → opencode optimal call.
  Use when user speaks diary-style, vague, or non-expert request.
  Intercepts user query, reads AGENTS.md + index.md, produces typed JSON + file list,
  then dispatches to verifiable opencode command (run/session/mcp only).
---

# Interpreter — diary to Excel

사용자는 일기장처럼 말해도 된다. 이 스킬이 엑셀(스키마)로 바꿔 하네스에 주입한다.
당신이 전문 개발자가 아니어도, 정확한 요청의 한계를 인터프리터가 메운다.

## Why this exists

- 사용자는 `“로그인 느리다”`처럼 말한다. 빌더는 `스키마`를 원한다.
- `opencode`는 20개 명령 중 3개만으로 95% 업무를 끝낼 수 있다. 사용자가 다 외울 필요 없다.
- 이 스킬이 `AGENTS.md:1`과 `index.md`를 읽어 **최적 호출 1개**를 만든다.

## Flow (always)

1. **Listen** — 사용자 원문 그대로 캡처. 추측하지 말고, 불명확하면 1개 질문만.
2. **Classify** — `intent`를 먼저 분류: `research|brainstorm` vs `build|fix|migrate|review`. `research|brainstorm`이면 `AGENTS.md`를 읽지 않고 외부 문서로 간다.
3. **Read (conditional)** — `build` 계열일 때만 `AGENTS.md` + `index.md` + `wiki/` 상위 3개 + `opencode.json:provider`를 읽고, `MCP`/`raw/`에서 verbatim 근거 1개 이상을 확보해야 다음 단계로 간다. `research`는 외부 검색으로 대체.
4. **Translate** — 아래 스키마로 변환:

```json
{
  "intent": "profile|build|fix|migrate|review",
  "files": ["src/auth.ts", "tests/login.spec.ts"],
  "schema": { "p99_ms": { "type": "number", "max": 800 } },
  "opencode_call": "opencode run --agent verify \"p99<800ms 검증\"",
  "model": "qwen/qwen3.8-pro",
  "mcp": ["palank-domain"]
}
```

5. **Dispatch** — `intent`가 `build`일 때만 `opencode run` / `opencode session` / `opencode mcp` 중 **하나**로 서브에이전트에 위임. `research`는 직접 답변.
6. **Verify** — `build`일 때만 `verify` 스킬에 위임. `research`는 검증 없이 종료.

## Model routing (user selectable)

- `opencode.json`에서 사용자가 고른 4개 중 선택:
  - `deepseek-v4-flash` — 벌크/저렴
  - `muse-spark-1.2` — 벌크/긴 컨텍스트
  - `qwen3.8-pro` — 터미널/도구
  - `deepseek-v4-pro` — 난이도 높은 추론
- 기본값: `bulk → flash/spark`, `tool-heavy → qwen3.8-pro`, `hard → deepseek-pro`

## Example

- **User**: “로그인 느리다”
- **Interpreter output**:
  ```
  intent: profile
  files: src/auth.ts:45, src/api/login.ts:12
  schema: { p99_ms: number<800 }
  call: opencode run --agent verify --model qwen/qwen3.8-pro "login p99<800 검증, 실패 시 프로파일 로그 첨부"
  ```

## Hard rules

- Never pass raw diary prompt to builder.
- Always produce `files` (1~5개) + `schema` (typed) + `opencode_call` (1개).
- If `files`를 모르면 `Grep`으로 1회 탐색 후 결정, 추측으로 파일명 만들지 않음.
- `AGENTS.md`가 단일 소스 — `CLAUDE.md`/`GEMINI.md` 분기 금지.
