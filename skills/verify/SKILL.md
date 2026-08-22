---
name: verify
description: >
  Model-agnostic coding guard — scaffold / lint / loop.
  Use when user says "검증", "린트", "배포 전", "완료", "테스트 통과".
  Runs checks itself, never trusts model's "tests pass".
---

# Verify — scaffold / lint / loop (model-agnostic)

`interpreter`가 스키마로 바꿔주면, 이 스킬이 **기계 검증**을 한다. `Opus`/`Qwen`/`Spark`/`DeepSeek` 모두가 같은 가드를 쓴다 — `AGENTS.md`가 얇은 하네스 표준이므로.

## Triggers

- `scaffold`, `init`, `스캐폴드`
- `lint`, `검증`, `check`
- `loop`, `완료`, `배포 전`

## 1. Scaffold

- `AGENTS.md` 단일 소스 유지, `opencode.json` 라우팅 유지
- `mcp/`는 프로젝트별 1개씩 확장, `skills/`는 하네스 소유

## 2. Lint (2 tiers)

- **Syntax**: `node --check` / `opencode.json` JSON 파싱
- **Mechanical**: `npm test` — 0 failures
- **Judgment**: 아키텍처 위반, 히스토리 유실 — 리포트만

## 3. Loop

- **Drift**: `git diff`로 주요 파일 변경 감지
- **GC**: 오래된 스캐폴드 정리, 이벤트 기반만
- **No TTL**: 시간 기반 삭제 금지

## Preflight (태그 전 필수)

```bash
npm run lint
npm test
npm pack --dry-run 2>&1 | grep -q "__pycache__" && exit 1 || echo "clean"
```

실패 시 태그 금지.

## Hard rules

- No guessing, official docs only — `interpreter`가 근거 없이 가면 이 스킬이 차단
- Skills never inside `mcp/` (하네스 소유 분리)
- Proposal-first for new skill
- **Enforcement**: 프롬프트가 아니라 게이트. 세션이 길어 `AGENTS.md`를 잊어도 `verify`가 기계로 다시 강제.

## Why model-agnostic

`CLAUDE.md`에만 가드를 쓰면 `Opus` 전용이 된다. `AGENTS.md`에 쓰면 `Opus`/`GPT`/`Qwen`/`Spark` 모두가 같은 게이트를 통과 — 모델 교체 시 가드 유지. 이것이 얇은 하네스의 핵심.
