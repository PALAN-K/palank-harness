---
name: parallel-subagent
description: 병렬 실행 역할 정의 (agent 아님) — conductor Task 위임 패턴의 역할 설명용
---

# parallel-subagent (role ≠ agent)

> 이 파일은 agent가 아니다. `opencode.json agent{}` 등록 없음,
> `.opencode/agent/*.md` 생성 금지 (thin 3-agent 유지).

## 역할
- conductor가 `Task(interpreter|verify)`로 병렬 위임할 때의 역할 약속만 정의
- transport 교체 없음, FULL 6단 변경 없음, 데몬·repo내 out/ 금지

## seals SSOT 인용
- 봉인 3종(`record/seal/grade.js`)이 SSOT, `canonicalize()`는 `record.js`에서만 import
- `scripts/oracle/seals.js`(복수형)는 포크가 아니라 thin wrapper/aggregator로만 존재 가능
- verdict bus는 `/tmp/verdict-bus-<ts>/`만 허용, repo 오염 0 (`git status --porcelain` 빈값)

## Tier
- FULL 확정 (BLACKLIST `skills/**` + untracked 이중사유), QUICK/SKIPPED 기대 없음