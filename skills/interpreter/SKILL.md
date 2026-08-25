---
name: interpreter
description: >
  Natural language → schema → opencode optimal call (Grilling Soft Gate + dynamic transparent wrapper).
  Use when user speaks diary-style, vague, or non-expert request.
  Startup inventory (debug skill/config + glob) → LLM selects optimal harness function.
---

# Interpreter — diary to Excel (Grilling Soft Gate + Dynamic Wrapper)

사용자는 일기처럼 말해도 된다. 이 스킬이 엑셀(스키마)로 바꿔 하네스에 주입한다.
동적 투명 래퍼 — 매 실행 인벤토리를 읽어 LLM이 런타임 목록에서 최적 기능을 선택.

## Startup Inventory — 동적 투명 래퍼 (매 실행, 5줄)
- `opencode debug skill` — 가용 스킬 인벤토리 (JSON)
- `opencode debug config` — 병합 설정 (agents, providers, plugins, mcp)
- `Glob .opencode/command/*.md` + `~/.config/opencode/command/*.md` — 슬래시 커맨드
- `Glob skills/**/SKILL.md` + `~/.config/opencode/skills/**/SKILL.md` — 스킬 인벤토리
- `available_tools[]` 수집 → LLM 프롬프트 주입 → classify → LLM이 최적 1개 선택 (정적 매핑 금지)

## GRILL (soft) — 배치 질문 게이트 (10줄, AGENTS.md:3)
**트리거:** `confidence<0.7` 또는 `intent ∈ {build,migrate,fix}` + `ambiguous(schema|intent|files)`
- **스킵:** 조건 미충족 시 질문 없이 바로 Classify.
- **질문 방식:** `question` 툴로 배치 2-5개, 각 선택지 2-4개 + `Recommended` 1개 + `직접입력(custom)`
- **대상:** `required` 필드만. `optional`은 기본값 유지, 묻지 않음.
- **라운드 제한:** max 1라운드. 답변 즉시 schema 잠금 → 다음 단계. 재질문 금지 (still <0.7 and required empty만 예외 1회).
- **문구:** 모호한 요구는 추측 금지 — 배치 질문으로 해소 후 명시적 확인.

## Flow (always, 15줄)
1. **Listen** — 원문 캡처, 추측 금지.
2. **GRILL** — 위 조건 시 배치 질문 → schema/files/intent 반영.
3. **Classify** — `intent`: `research|brainstorm` vs `build|fix|migrate|review`. research는 AGENTS.md 없이 외부 검색.
4. **Read (conditional)** — build 계열만 3-layer: AGENTS.md (헌법) → index.md (카탈로그) → wiki/요약 → raw/verbatim (MCP get_context 5파일 제한). wiki 없으면 fallback, foundry는 skeleton이므로 evidence gate active.
5. **Translate** — schema 변환: `{intent, files[1-5], schema, opencode_call, model: tier, mcp}`. files 모르면 Grep 1회 탐색, 추측 금지.
6. **Dispatch** — build만 `opencode run|session|mcp` 중 1개로 위임. research는 직접 답변.
7. **Verify** — build만 verify 스킬에 위임. research는 검증 없이 종료.

## Model routing (tiers only)
Concrete `provider/model` lives only in `opencode.json` SSOT. Docs reference tiers: `minimal`/`bulk-cheap`/`terminal-strong`/`reasoning-frontier`. 1줄 교체로 스왑, 단일 모델 OK.

## Example
- User: "로그인 느리다" → GRILL 스킵 → intent:profile files:src/auth.ts schema:{p99_ms<800} call: `opencode run --agent verify "p99<800 검증"`
- User: "새 기능 추가해줘" (모호) → GRILL 배치 3개: 기능/대상파일/완료기준 → 응답 후 schema 잠금 → build → opencode_call 생성

## Hard rules
- Never pass raw diary to builder. Always files[1-5]+schema+opencode_call. AGENTS.md 단일 소스, CLAUDE/GEMINI 분기 금지.
- GRILL은 required만, optional 기본값, max 1라운드. 정적 매핑 테이블 하드코딩 금지 — 매 실행 Inventory만.
- `AGENTS.md:3` Clarify Before Contract와 일치 — 임계치 넘으면 배치 질문 후 스키마 잠금.

## References (appendix, not core)
- `archive/006-palank-harness-v1-20260825/skills/interpreter/SKILL.md` — v1 full 126 lines (dynamic wrapper 15줄 + GRILL 10줄 + Flow 15줄 + routing 10줄 + example 10줄)
- `archive/006-palank-harness-v1-20260825/skills/interpreter/references/` — hashline, wrapper docs
- Current 60 lines is distilled core — 4원칙 문장만 이식, transparent wrapper 5줄 + GRILL 10줄 + Flow 15줄 = 30줄 핵심 + 나머지 30줄은 example/routing/hard rules
- Startup inventory는 매 실행마다 `opencode debug skill/config` + Glob 4개로 available_tools[] 동적 수집 — SKILL.md에 하드코딩 금지
- Dispatch는 3-tier 중 하나: `opencode run --agent verify` (단발), `opencode session` (장문맥), `opencode mcp` (도메인 툴)
- Verify loop는 model-agnostic — 모든 티어가 같은 가드 통과, `AGENTS.md` 얇은 하네스 표준
- Interpreter가 스키마로 바꾸면 verify가 기계 검증 — 둘 다 없으면 하네스 아님
- Worktree 격리: `npm run sandbox:new <id>` → `.worktrees/<id>/` 에서 작업 → verify → merge back — main clean 유지
- Hashline은 optional appendix — build/migrate 시 `scripts/hashline.js` 1 read/1 write, stale reject, pure Node (see verify SKILL.md:4)
- Vault evidence: wiki 쓰기 전 `raw/` verbatim grep 필수 — every number/date/quote must be cited from raw or official docs
- Index parity: wiki/**/*.md vs index.md bullets — `check_vault.js:61`이 기계 검증, 0/0 skeleton은 PASS
- Drift: `Vault-Base: git:<hash>` + `Tracked: <paths>` → `git diff --name-only <hash> -- <paths>` 0-token check
- Conductor는 edit/write/bash 금지 — plugins/force-delegation.js가 런타임 하드 블럭, Task 위임만 허용
- 모호한 요구는 배치 질문으로 해소 — 추측 금지, 1라운드 후 스키마 잠금, required만 질문
- See `skills/verify/SKILL.md` for scaffold/lint/loop guard — interpreter는 diary→schema, verify는 기계 검증
- Thin foundry: 50(AGENTS)+80(SPEC)+60+60(skills)+116(check_vault) = 366줄 core — v1 435줄 대비 70줄 감소, hashline 185줄은 archive appendix
- Next: `npm run verify` 0 errors 확인 후 `git cherry-pick tier/migration`에서 opencode.json _routing_note만 선택 이식
- Changelog: v1 126 lines → v2 60 lines — distilled to core, archive retains full for reference.
- Vault-Base: git:7c2e97d — see archive for v1 entangled history, `git log --follow` tracks renames.
