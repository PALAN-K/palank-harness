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

- `raw/` 불변, `wiki/`는 LLM 소유, `index.md`/`log.md`는 동시 갱신
- `opencode.json` 라우팅 유지, `AGENTS.md` 단일 소스

## 2. Lint (3 tiers, same as llm-wiki-loop)

- **Safe fixes**: `index.md` row count vs 실제 파일, `Raw` 링크
- **Mechanical**: `python3 skills/wiki-manager/scripts/check_evidence.py --strict .` — 0 suspects/0 errors/0 unreferenced
- **Judgment**: 모순, 오래된 주장, 고아 페이지 — 모델 판단, 리포트만

## 3. Loop

- **Drift**: `Fingerprint: git:<hash>` + `Monitored:` 로 0-token 드리프트 탐지. `git diff --name-only <hash> -- <paths>`가 비면 fresh.
- **GC**: 의존성 변경 시 `Status: Outdated` 블록, 완전 대체는 `archive/`
- **No TTL**: 시간 기반 삭제 금지, 이벤트 기반만

## Preflight (태그 전 필수)

```bash
npm run lint
npm test
node ../003\ palank-llm-wiki/bin/cli.js check --strict .  # 또는 python3 check_evidence.py --strict .
npm pack --dry-run 2>&1 | grep -q "__pycache__" && exit 1 || echo "clean"
```

실패 시 태그 금지.

## Hard rules (ported from llm-wiki-loop SPEC.md:4 / AGENTS.md:1-7)

- Never edit `raw/`
- Every number/date/quote must exist verbatim in `Raw:` — no guessing, official docs only (AGENTS.md:5)
- Index + log updated together, always
- Skills never inside `wiki/`
- Proposal-first for new skill
- **Enforcement**: `AGENTS.md:5`는 프롬프트가 아니라 게이트. `interpreter`가 근거 없이 3번으로 가면 이 스킬이 `check --strict`에서 `suspect`로 차단. 세션이 길어 `AGENTS.md`를 잊어도 `verify`가 기계로 다시 강제.

## Why model-agnostic

`CLAUDE.md`에만 가드를 쓰면 `Opus` 전용이 된다. `AGENTS.md`에 쓰면 `Opus`/`GPT`/`Qwen`/`Spark` 모두가 같은 게이트를 통과 — 모델 교체 시 가드 유지. 이것이 얇은 하네스의 핵심.
