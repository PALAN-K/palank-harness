# Palank Harness — Thin Foundry Plan (006)

> 프레임워크 파운드리 + MCP 골격 = 완전체. 인기 얇은 하네스의 장점만 이식, 모델·프로젝트 교체 시 설정 1줄.

**생성일**: 2026-08-21 / **위치**: `D:\010 Web Applicaton\006 palank-harness` / **베이스**: `OpenCode` + `muse-spark-1.2`/`qwen3.8-pro`/`deepseek-v4-flash/pro` (사용자 선택)

## 1. 목표

- 비전문가도 일기장처럼 말하면 `interpreter`가 스키마로 바꿔 `opencode` 3개 명령(`run`/`session`/`mcp`)만으로 최적 호출
- 프로젝트마다 MCP 1개만 교체해 10분 확장 — 하네스 자체는 매번 새로 만들지 않음
- `verify`가 `lint/test/pack`을 기계적으로 강제 — 재발 방지

## 2. 아키텍처 (얇은 하네스 4원칙)

```
사용자(자연어) → interpreter(AGENTS.md→스키마) → OpenCode 하네스(도구 실행) → verify(기계 검증) → MCP 기록
```

- **라우팅**: 쉬운 일은 `deepseek-v4-flash`/`muse-spark-1.2`, 어려운 일은 `qwen3.8-pro`/`deepseek-v4-pro`로 에스컬레이션 — 1,000스텝 $750→$154
- **제약(스키마)**: 프롬프트 대신 `JSON Schema`로 결정 공간 축소. `OPT-350M 30%→80%`가 증명
- **검증 루프**: 모델의 `tests pass`를 믿지 않고 하네스가 직접 `npm test`/`check:vault --strict`/`pack` 실행
- **폐기성**: 하네스는 스펙을 강제하는 비계. 다음 분기 모델 교체 시 스캐폴드 유지

## 3. 파일 맵 (완전체)

```
006/
├── AGENTS.md (50줄, 모든 모델이 먼저 읽는 단일 소스)
├── opencode.json (provider 3개, model 4개, agent 3개(conductor/interpreter/verify), plugin 2개)
├── package.json (lint/verify/mcp:dev)
├── skills/interpreter/SKILL.md (diary→Excel, 20개 명령 중 3개만)
├── skills/verify/SKILL.md (scaffold/lint/loop, 모델 무관)
├── mcp/ (palank-domain 스텁, @modelcontextprotocol/sdk)
├── plugins/force-delegation.js (3중 강제 가드)
├── dynamicSubAgents.json (100개 동적 생성)
└── PLAN.md (this file)
```

## 4. 모델 선택표 (opencode.json에서 체크박스)

| 용도 | 모델 | 가격 | 선택 이유 |
|---|---|---|---|
| 벌크 생성 | `deepseek-v4-flash` / `muse-spark-1.2` | $0.15~$1.25 | 저렴, 1M 컨텍스트 |
| 터미널/도구 | `qwen3.8-pro` | $2 | Terminal-Bench 86.6% 최강 |
| 하드 추론 | `deepseek-v4-pro` | $6 | 최고 지능 |
| 검증 | `qwen3.8-pro` | $2 | 엄격, 저렴 |

> 모델 매핑은 예시 — easy→ muse-spark/flash, hard→ qwen3.8-pro/deepseek-pro로 바꿔도, 하나의 모델만 사용해도 정상. `opencode.json: model` 1줄 교체로 라우팅 변경, 비용 최적 + 교차 긍정 효과(per papers).

`opencode.json:provider`에서 `baseURL`만 바꾸면 즉시 교체.

## 5. Harness Knowledge Vault (mechanical / layered / archive)

- **006** is private foundry thin — harness is scaffolding (disposable), wiki is spec (static encyclopedia)
- **기계 검증**: `raw/` immutable → `wiki/` LLM-owned `Raw:` 링크 → `check_vault --strict` 0 errors
- **계층 리딩**: `AGENTS.md → index.md → wiki/ 요약 → raw/ 원전` 3-layer, MCP get_context 5파일 제한
- **격리 보존**: `Status: Outdated` 블록 + `archive/YYYY-MM-DD/` 이동, 삭제 금지, No TTL event-based
- **이중 장부**: `index.md(지도) + log.md(원장)` 원자적 동시 갱신
## 6. MCP 골격 (최적화 라이브러리)

- **라이브러리**: `@modelcontextprotocol/sdk` — MIT, `OpenHarness`/`DeepSeek Harness`도 동일. 도구 디스커버리·스키마 검증·재시도 내장
- **스텁 툴 3개**: `search_wiki`, `get_context`, `verify_before_tag` — 프로젝트마다 `search_orders` 같은 도메인 툴 1개 추가
- **확장**: `mcp/server.js`의 `tools` 배열에 1줄 추가, `opencode.json:mcp`는 그대로

## 7. 사용법 (이 폴더에서 재실행)

```bash
# 1. 이 폴더에서 OpenCode 시작 — AGENTS.md 자동 로드, interpreter가 당신 말을 스키마로 바꿈
opencode

# 2. 새 프로젝트 스캐폴드
opencode run "006을 복사해 007 my-project를 만들고 MCP 1개 교체해줘" --agent interpreter

# 3. 검증 (배포 전 가드)
npm run verify
```

## 8. 검증 완료

- `opencode.json` JSON ok, `mcp/server.js` --check 0, `skills/*` 2개 + `plugins/force-delegation.js`, `dynamicSubAgents.json` 4모델
- 다음: `D:\010 Web Applicaton\006 palank-harness`에서 `opencode` 재실행 후 `interpreter` 호출 테스트
