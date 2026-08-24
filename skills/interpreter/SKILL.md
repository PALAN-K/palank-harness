---
name: interpreter
description: >
  Natural language → schema → opencode optimal call (Grilling Soft Gate + dynamic transparent wrapper).
  Use when user speaks diary-style, vague, or non-expert request.
  Performs startup inventory (debug skill/config + glob) → LLM selects optimal harness function from runtime list,
  then clarifies via batch questions only when ambiguity threshold exceeded before locking schema.
---

# Interpreter — diary to Excel (Grilling Soft Gate + Dynamic Transparent Wrapper)

사용자는 일기장처럼 말해도 된다. 이 스킬이 엑셀(스키마)로 바꿔 하네스에 주입한다.
당신이 전문 개발자가 아니어도, 정확한 요청의 한계를 인터프리터가 메운다.
이 스킬은 **동적 투명 래퍼**다 — 매 실행 인벤토리를 읽어 LLM이 런타임 목록에서 최적 하네스 기능을 선택한다.

## Why this exists

- 사용자는 `“로그인 느리다”`처럼 말한다. 빌더는 `스키마`를 원한다.
- `opencode`는 20개 명령 중 3개만으로 95% 업무를 끝낼 수 있다. 사용자가 다 외울 필요 없다.
- 이 스킬이 `AGENTS.md:1`과 `index.md`를 읽어 **최적 호출 1개**를 만든다.

## Startup Inventory — 동적 투명 래퍼 (매 실행 인벤토리 리딩)

> 매 실행 시: debug skill+config+glob → available_tools[] → LLM 프롬프트 주입 → classify → LLM이 런타임 목록에서 최적 하네스 기능 선택

**원칙: 정적 매핑 테이블 금지.** 컨텍스트 → 슬래시 명령을 SKILL.md에 하드코딩하지 않는다.
대신 매 실행마다 인벤토리를 직접 읽어 신형 커맨드/스킬이 자동 반영되도록 한다. LLM이 분류 후 런타임 목록에서 최적 기능을 선택한다.

**동적 디스커버리 경로 (고정 — 결과는 매 실행마다 가변):**
- `opencode debug skill` — 가용 스킬 인벤토리 (JSON, built-in + project + global + external)
- `opencode debug config` — 병합된 최종 설정 (agents, commands, providers, plugins, mcp)
- `Glob .opencode/command/*.md` — 프로젝트 슬래시 커맨드
- `Glob ~/.config/opencode/command/*.md` — 글로벌 슬래시 커맨드
- `Glob .opencode/skills/**/SKILL.md`, `skills/**/SKILL.md`, `~/.config/opencode/skills/**/SKILL.md` — 스킬 인벤토리
- `opencode debug paths` — 전역 경로 해소 (data/config/cache/state)
- `Glob .opencode/agent/*.md` / `~/.config/opencode/agent/*.md` — 에이전트 인벤토리 (필요 시)

**실행 순서:**
1. 위 명령/Glob을 실행해 `available_tools[]`를 수집 (JSON 파싱 또는 파일 목록).
2. 수집된 목록을 LLM 프롬프트 컨텍스트에 주입 (시스템 프롬프트 또는 분류 단계 입력).
3. `classify` 단계에서 LLM이 사용자 의도와 가용 목록을 대조해 최적 하네스 기능 1개를 선택.
4. 선택된 기능이 슬래시 커맨드/스킬/에이전트/플러그인 중 무엇이든, 그 호출 형태로 `opencode_call`을 생성.

**정적 매핑 금지 예시 (하지 말 것):**
- ❌ SKILL.md 내부에 `| "왜 느려졌어" → /debug | "새 기능" → /diff |` 같은 고정 표를 나열

**동적 선택 예시 (매 실행 인벤토리 기반, LLM이 런타임에 결정):**
- `“왜 느려졌어”` → 인벤토리에서 `debug` + `palank-domain:search_wiki`가 가용함을 확인 → LLM이 `opencode debug` + `mcp/palank-domain search_wiki` 조합을 선택해 원인 분석 호출 생성
- `“새 기능 추가해줘”` → 인벤토리에서 `worktree`, `verify`, 가용 커맨드 목록을 확인 → LLM이 `sandbox:new` 격리 + 스키마 기반 빌드 + `verify` 루프 조합을 선택

## Flow (always)

1. **Listen** — 사용자 원문 그대로 캡처. 추측하지 않음.

2.5 **GRILL (soft) — 배치 질문 게이트** — `Listen`과 `Classify` 사이에 위치. Soft gate이므로 조건부로만 동작한다.
   - **트리거 조건 (둘 중 하나라도 해당 시에만 질문):**
     - `confidence < 0.7` (의도/스키마/파일 중 하나라도 불확실)
     - 또는 `intent ∈ {build, migrate, fix}` 이면서 `ambiguous(schema | intent | files)` — 필수 스키마 필드/대상 파일/의도 구분이 모호
   - **스킵 조건:** 위 조건 미충족 시 질문 없이 바로 `Classify`로 진행. 명확한 요청은 추가 질문 없이 스키마 잠금.
   - **질문 방식:** `question` 툴로 **배치 질문 2~5개**를 한 번에 제시. 각 질문은 선택지 2~4개 + `Recommended` 표기 1개 + `직접 입력(custom)` 허용. `question` 툴의 `custom` 입력이 “Type your own answer”를 제공한다.
   - **질문 대상:** `required` 필드만 질문. `optional`은 기본값 유지, 묻지 않음. 예: `files`의 핵심 경로, `schema`의 필수 제약(p99, auth 방식 등), `intent` 분기(build vs research).
   - **원칙 문구:** 모호한 요구는 추측 금지 — 배치 질문으로 해소 후 명시적 확인
   - **라운드 제한:** **max 1라운드 원칙.** 답변 수신 즉시 스키마에 반영해 잠금하고 다음 단계로 진행. 재질문은 `confidence`가 여전히 `<0.7`이고 `required`가 비어 검증 불가일 때만 예외적으로 1회 더 허용, 그 외 금지.
   - **후처리:** 응답을 `schema`/`files`/`intent`에 반영 → `Classify` 재확인 → `Read`로 진행.

2. **Classify** — `intent`를 먼저 분류: `research|brainstorm` vs `build|fix|migrate|review`. `research|brainstorm`이면 `AGENTS.md`를 읽지 않고 외부 문서로 간다. GRILL 단계에서 이미 배치 질문으로 모호도가 해소되었으면 이 분류를 확정한다.

3. **Read (conditional)** — `build` 계열일 때만 3-layer로 읽는다: AGENTS.md (헌법) → index.md (카탈로그 1줄/페이지) → wiki/ 요약 → raw/ 원전 verbatim — 기존 AGENTS.md + index.md + wiki/ 상위 3개 + opencode.json:provider + MCP/raw/ verbatim 유지, MCP get_context 5파일 제한. wiki/ 없으면 (no index) fallback, but foundry now has wiki/ skeleton so evidence gate active. `MCP`/`raw/`에서 verbatim 근거 1개 이상을 확보해야 다음 단계로 간다. `research`는 외부 검색으로 대체.

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

User selectable — e.g., easy→ muse-spark/flash (general), hard→ qwen3.8-pro/deepseek-pro (frontier), swappable, single model OK. Cost-optimal routing + cross-model positive effect per papers. Change in opencode.json 1 line.

- 예시 매핑:
  - `muse-spark-1.2` / `deepseek-v4-flash` — 벌크/저렴 (general)
  - `qwen3.8-pro` / `deepseek-v4-pro` — 터미널/도구·난이도 높은 추론 (frontier)
- `opencode.json` 1줄 교체로 모델 스왑, 단일 모델도 OK.

## Example

- **User**: “로그인 느리다”
- **Interpreter output (GRILL 스킵 케이스 — 명확한 프로파일링 요청):**
  ```
  intent: profile
  files: src/auth.ts:45, src/api/login.ts:12
  schema: { p99_ms: number<800 }
  call: opencode run --agent verify --model qwen/qwen3.8-pro "login p99<800 검증, 실패 시 프로파일 로그 첨부"
  ```
- **User**: “새 기능 추가해줘” (모호 — GRILL 트리거)
- **Interpreter GRILL:**
  ```
  question 툴 배치 질문 3개:
  1. 어떤 기능인가요? [Recommended: 인증 개선 / 결제 연동 / 대시보드 (직접 입력)]
  2. 대상 파일/영역? [Recommended: src/features/* / 기존 페이지 수정 (직접 입력)]
  3. 완료 기준? [Recommended: 테스트 통과 + 문서 업데이트 (직접 입력)]
  → 응답 수신 후 schema 잠금 → classify=build → opencode_call 생성
  ```

## Hard rules

- Never pass raw diary prompt to builder. Always produce files[1-5]+schema+opencode_call. If files unknown, Grep 1회 탐색 후 결정.
- If `files`를 모르면 `Grep`으로 1회 탐색 후 결정, 추측으로 파일명 만들지 않음.
- `AGENTS.md`가 단일 소스 — `CLAUDE.md`/`GEMINI.md` 분기 금지.
- 모호한 요구는 추측 금지 — 배치 질문으로 해소 후 명시적 확인. GRILL(soft) 게이트를 통해서만 해소, 그 외 추측 금지.
- GRILL은 required 필드만, optional은 기본값 유지. max 1라운드 원칙 준수.
- 정적 슬래시/스킬 매핑 테이블을 SKILL.md에 하드코딩하지 않음. 매 실행 Startup Inventory로 동적 조회만 기술.
- `AGENTS.md` Rules 6(Clarify Before Contract)과 일치하게 동작 — 임계치 넘으면 배치 질문 후 스키마 잠금.
