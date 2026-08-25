# Palank Harness — Thin Foundry (0.2.0)

> 프레임워크 파운드리 + MCP 골격 = 완전체. 인기 얇은 하네스의 장점만 이식.

**베이스**: `OpenCode` + `tier:minimal`/`tier:bulk-cheap`/`tier:terminal-strong`/`tier:reasoning-frontier` (concrete `provider/model`은 `opencode.json` SSOT)

## 시작

```bash
opencode  # AGENTS.md 50줄 자동 로드, interpreter가 말을 스키마로 바꿔 최적 호출
npx palank-harness init ./my-project  # 스캐폴드
```

## 모델 선택 (체크박스 — 티어만, 구체 모델은 opencode.json SSOT)

`opencode.json:_routing_note`에서 티어→모델 매핑 1줄 교체:

- 벌크 생성: `tier:bulk-cheap`
- 터미널/툴: `tier:terminal-strong`
- 하드 추론: `tier:reasoning-frontier`
- 타이틀/요약: `tier:minimal`

> 티어 매핑은 예시 — `opencode.json`에서만 구체 `provider/model` 교체. 단일 티어로도 정상. 비용 최적 + 교차 긍정 효과는 티어 라우팅으로 유지. Change in `opencode.json` 1 line — harness stays.

## 구조

- `AGENTS.md` 50줄 — 헌법 (Harness=Model+Guard, Layout, Rules 6(Clarify #3), Routing, Verification, MCP, Principle)
- `SPEC.md` 80줄 — why (Trust Boundary, Vault 3-layer, Grounding, Lifecycle, Conformance, CI Lite)
- `skills/interpreter` 60줄 — 동적 투명 래퍼 (inventory 5줄 + GRILL 10줄 + Flow 15줄)
- `skills/verify` 60줄 — scaffold/lint/loop guard (이중장부 10줄 + 3tier 15줄 + hashline appendix 1줄)
- `mcp/palank-domain` — `@modelcontextprotocol/sdk` 기반 스텁, 프로젝트별 1개 복사
- `scripts/check_vault.js` 116줄 — vault linter (index parity, Raw citation, drift `Vault-Base: git:<hash>`)
- `archive/006-palank-harness-v1-20260825/` — v1 entangled harness (435줄, hashline 185줄) history preserved via `git mv`, `git log --follow`로 추적

## 하네스 원칙

- **라우팅**: tiers only, concrete는 SSOT 1줄
- **제약(스키마)**: 프롬프트 대신 JSON Schema로 결정 공간 축소
- **검증 루프**: 모델의 `tests pass`를 믿지 않고 하네스가 직접 `npm test`/`pack` 실행 — local infinite loop + CI Lite Clean Room
- **폐기성**: 하네스는 스펙을 강제하는 비계. 모델 교체 시 스캐폴드 유지. Spec is asset, harness is scaffolding.

## 검증

```bash
npm run lint                 # opencode.json ok + mcp/server.js + scripts/check_vault.js + bin/cli.js
npm run check:vault --strict # 0 errors, 0 suspects — wiki 1 && index 1 parity ok, Raw: archive/.../SPEC.md, Vault-Base: git:7c2e97d drift ok
npm test                     # harness.test + hashline.test 5 pass
npm run verify               # all + pack hygiene — zero errors required
npm pack --dry-run           # no __pycache__ leak
```

CI Lite: `.github/workflows/gate.yml` PR-only (lint + check:vault --strict + pack hygiene, fetch-depth:0 for drift).

## 다음

`AGENTS.md` 50줄이 법. 어떤 프로젝트든 `006`을 복사해 `mcp/palank-domain` 1개만 교체 → 10분 확장.

Vault-Base: git:7c2e97d — see `archive/006-palank-harness-v1-20260825/` for v1 history. `wiki/concepts/thin-foundry.md` explains why thin.