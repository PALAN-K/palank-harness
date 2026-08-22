# Palank Harness — Complete Foundry Plan (006)

> 프레임워크 생성 + 위키루프 이식 + MCP 골격 = 완전체. 인기 얇은 하네스의 장점만 이식, 모델·프로젝트 교체 시 설정 1줄.

**생성일**: 2026-08-21 / **위치**: `D:\010 Web Applicaton\006 palank-harness` / **베이스**: `OpenCode` + `muse-spark-1.2`/`qwen3.8-pro`/`deepseek-v4-flash/pro` (사용자 선택) + `llm-wiki-loop` 핵심

## 1. 목표

- 비전문가도 일기장처럼 말하면 `interpreter`가 스키마로 바꿔 `opencode` 3개 명령(`run`/`session`/`mcp`)만으로 최적 호출
- 프로젝트마다 MCP 1개만 교체해 10분 확장 — 하네스 자체는 매번 새로 만들지 않음
- 상품(`bin/skills`)과 개발 볼트(`raw/wiki`) 경계를 `verify`가 기계적으로 강제 — 재발 방지

## 2. 아키텍처 (얇은 하네스 4원칙)

```
사용자(자연어) → interpreter(AGENTS.md+index.md→스키마) → OpenCode 하네스(도구 실행) → verify(기계 검증) → wiki/MCP 기록
```

- **라우팅**: 쉬운 일은 `deepseek-v4-flash`/`muse-spark-1.2`, 어려운 일은 `qwen3.8-pro`/`deepseek-v4-pro`로 에스컬레이션 — 1,000스텝 $750→$154
- **제약(스키마)**: 프롬프트 대신 `JSON Schema`로 결정 공간 축소. `OPT-350M 30%→80%`가 증명
- **검증 루프**: 모델의 `tests pass`를 믿지 않고 하네스가 직접 `npm test`/`wiki:lint`/`pack` 실행
- **폐기성**: 하네스는 스펙을 강제하는 비계. 다음 분기 모델 교체 시 스캐폴드 유지

## 3. 파일 맵 (완전체)

```
006/
├── AGENTS.md (50줄, 모든 모델이 먼저 읽는 단일 소스 — CLAUDE.md 분기 없음)
├── opencode.json (provider 3개, model 4개, agent 2개, mcp 1개)
├── package.json (lint/verify/mcp:dev)
├── skills/interpreter/SKILL.md (diary→Excel, 20개 명령 중 3개만)
├── skills/verify/SKILL.md (scaffold/lint/loop, 모델 무관)
├── mcp/
│   ├── package.json (@modelcontextprotocol/sdk 1.12.0)
│   ├── server.js (search_wiki/get_context/verify_before_tag 3 tools)
│   └── README.md (프로젝트별 확장 가이드)
├── wiki/ + raw/ + index.md + log.md (llm-wiki-loop 핵심만 이식: Grounding/Fingerprint/index+log)
└── PLAN.md (this file)
```

## 4. 모델 선택표 (opencode.json에서 체크박스)

| 용도 | 모델 | 가격 | 선택 이유 |
|---|---|---|---|
| 벌크 생성 | `deepseek-v4-flash` / `muse-spark-1.2` | $0.15~$1.25 | 저렴, 1M 컨텍스트 |
| 터미널/도구 | `qwen3.8-pro` | $2 | Terminal-Bench 86.6% 최강 |
| 하드 추론 | `deepseek-v4-pro` | $6 | 최고 지능 |
| 검증 | `qwen3.8-pro` | $2 | 엄격, 저렴 |

`opencode.json:provider`에서 `baseURL`만 바꾸면 즉시 교체.

## 5. 위키루프 이식 (필요 요소만)

- **유지**: `AGENTS.md` 규칙 1~4, `Fingerprint`/`Monitored`, `index+log` 동시 갱신, `raw/` 불변
- **제외**: 전체 `SPEC.md` 8장 중 실행 불필요 부분, `archive/` 자동화는 2단계로 미룸
- **위치**: `006/wiki/`는 하네스 지식 가드, `003 palank-llm-wiki`는 프레임워크 원전 — 둘은 `Fingerprint`로 연결

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

- `opencode.json` JSON ok, `mcp/server.js` --check 0, `skills/*` 2개, `wiki` 0 drift (fresh)
- 다음: `D:\010 Web Applicaton\006 palank-harness`에서 `opencode` 재실행 후 `interpreter` 호출 테스트
