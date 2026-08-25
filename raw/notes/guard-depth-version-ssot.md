# Guard Depth & Version SSOT — repair round evidence (2026-08-26)

적용: v3.2 감사 후속 수리 배치(W1–W7). 모든 수치는 당일 실측값이다.
마스터 버전: package.json 3.2.0 / opencode CLI 1.18.23 / Node v24.11.0 / git HEAD 7fdee06.

## R1 — permission 병합 실측 (W1 근거)

- 프로브: `opencode debug config`(스냅샷 temp r1-config-before.json) → 해석된
  `agent.conductor.permission`은 프로젝트 값 그대로 `edit:"deny"` 유지.
  글로벌(`~/.config/opencode/opencode.json`) 최상위 `permission.edit="allow"`와 공존해도
  **프로젝트 에이전트 레벨이 우선** — 공식 문서 "Agent permissions are merged with the global
  config, and agent rules take precedence"(opencode.ai/docs/permissions, 2026-08-25 기준)와 일치.
- W1 적용 후 재프로브(r2-config-after.json): `conductor.permission.bash = {"*":"deny"}` 해석 확인.
  객체형은 글로벌 bash 맵과 동일 스키마로 통일(문자열 아님).

## R2 — 외부 플러그인 실태와 고정 (W2 근거)

- 발견: spec `cgasgarth/opencode-dynamic-subagents`는 **관성(inert)**.
  증거 3점: ① normal vs `--pure` 프로브의 agent 키 목록 완전 동일 ② 캐시
  `~/.cache/opencode/packages/cgasgarth/opencode-dynamic-subagents` 빈 디렉터리(2026-08-22 클론 실패 잔해)
  ③ node_modules·bun.lock 부재, "failed to load plugin" 로그 없음(조용한 스킵).
- 공식 문서(opencode.ai/docs/plugins)는 npm 패키지 문법만 지원. owner/repo 형식은 미문서화.
- 조치(사용자 확정): `opencode-dynamic-subagents@0.3.1`로 교체 — npm 최신=0.3.1(gitHead 6715d22,
  SLSA provenance 서명, MIT, engines node>=22).
- 결과 실측: 재프로브에서 **dsa-* 에이전트 12개 생성**(spark/qwen/flash/pro × low/medium/high),
  exit 0, failed-to-load 부재. 설치 위치
  `~/.cache/opencode/packages/opencode-dynamic-subagents@0.3.1/node_modules/`.
- 전역 `~/.config/opencode/dynamicSubAgents.json`이 원래 구성돼 있어 활성화가 설계 의도와 일치.

## R4 — write 키 포괄 관계 (W4 근거)

- 공식 Permissions 문서 명시: "`edit` — all file modifications (covers `edit`, `write`, `patch`)".
- 결론: conductor의 `"write":"deny"`는 중복 → **제거**. edit deny 하나로 3종 전부 차단.
  replication-checklist 3단계의 "유지 중" 표기를 "제거 완료"로 갱신.
- _routing_note의 유령 4-tier 어휘(tier:minimal/bulk-cheap/terminal-strong/reasoning-frontier) 삭제,
  skills/interpreter/SKILL.md Flow 8단계의 실사용 3-tier(verify 단발/session 장문맥/mcp 도메인)로 정합.

## R3 — 버전 문자열 전수 스윕 (W6 근거)

라이브(동기화 대상, sync-version.js TARGETS 선언):
- mcp/package.json `.version` — 3.1.0 → 3.2.0 수정 완료
- mcp/package-lock.json 루트+packages[""] `.version` — 3.0.0 → 3.2.0 수정 완료(diff 2줄뿐, churn 없음)
- AGENTS.md H1 토큰 v3.2 / README.md H1 토큰 v3.2 / package.json description v3.2 — 현시점 동기 확인

제외(설계상):
- log.md 역사 항목(append-only 장부), wiki/raw의 "v3.1 신설" 등 출처 라벨,
  코드 주석·SKILL.md의 연혁 표기, AGENTS.md 섹션 제목 "(v3.1 — design guidance)",
  mcp/server.js 사코드 폴백 상수("3.1.0" — 루트 package.json 읽기가 항상 성공하는 dead default;
  잔여 리스크로 보고함).

## W3 — check_vault 링크 게이트

- 검사 d 신설: index.md + wiki/**의 `[text](path)` 대상 존재. scheme(http/https/mailto…)·
  앵커(#) 스킵, 상대경로는 저장소 루트 기준 해석(index 불릿 관례와 일치).
- 실패 분기 테스트 3종 추가: index-parity mismatch / Vault-Base hash-unreachable(git init 픽스처)/
  끊긴 마크다운 링크(+정상 링크 통과 동시 단언).

## W5 — explore/general 태스크 키의 의도적 참조

- `explore: allow`: opencode 빌트인 리서치 전용 서브에이전트(공일 문서: General·Explore·Scout).
  실측 `opencode debug agent explore`가 본 프로젝트에서 resolve(permission allow *) — Rule 5의
  research-only 레인. Echo 게이트는 Task 프롬프트 전체에 보편 적용되므로 explore도 마커 없이는 통과 불가.
- `general: deny`: 미래 버전이 범용 에이전트를 추가하더라도 인터프리터 흐름 밖 build형 작업을
  받지 못하게 하는 선제 가드(fail-closed 기본). 확대는 설정 변경=감사 가능한 결정으로만.

## 남은 리스크 (보고서 겸용)

1. mcp/server.js 폴백 상수 "3.1.0" — SSOT 밖 dead code(도달 불가 경로).
2. 캐시 잔해 `packages/cgasgarth/`(빈 디렉터리) — 저장소 밖, 미확보해도 무해.
3. AGENTS.md 세션 중 수정(사용자 승인) → 다음 세션부터 반영. 재시작 필요.
4. gate 마커 자체선언 한계는 SKILL.md 문서화대로 유효(이번 배치 변경 없음).
