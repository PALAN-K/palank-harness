# 006 Overview — 3-Tier Architecture

Vault-Base: git:b14f1bbcfd574590a6cd13b5b662fa3e994bca2e

> Raw: raw/notes/v3-charter.md

## 요약

`006-palank-harness`의 전체 시스템 구조를 3개 계층으로 정의한 최상위 아키텍처 SSOT 문서이다. 바이브코딩 시 백엔드 직관을 유지하고, 허용된 컴포넌트 화이트리스트(Allowlist)를 제공하여 곁가지와 좀비 코드(Dead Code)의 증식을 차단한다.

## 3계층 시스템 구조 (System Tiers)

```text
+-------------------------------------------------------------------------+
| 1계층: 오케스트레이션 및 가드레일 (Orchestration & Guardrails)            |
| - conductor (primary orchestrator, no direct edits)                     |
| - opencode.json (SSOT: 모델 레지스트리, 에이전트/툴 권한 정의)             |
| - plugins/force-delegation.js (위임 강제 런타임 하드블록)               |
+-------------------------------------------------------------------------+
                                    │ Task 위임 (gate:echo-confirmed)
                                    ▼
+-------------------------------------------------------------------------+
| 2계층: 인터프리터 및 스키마 엔진 (Interpretation & Schema Engine)        |
| - interpreter (skills/interpreter/SKILL.md, diary -> schema 변환)       |
| - 3모드 실행 루프 (guardian / pilot / kamikaze)                          |
| - Echo 요약 -> Interview 질문(누락필드만) -> Lock 스키마 확정          |
| - scripts/validate-schema.js (Lock 게이트 정형 검증기)                   |
+-------------------------------------------------------------------------+
                                    │ Dispatch / Verify 위임
                                    ▼
+-------------------------------------------------------------------------+
| 3계층: 기계적 게이트 및 지식 볼트 (Mechanical Gates & Vault SSOT)         |
| - verify (skills/verify/SKILL.md, 기계 자체 구동)                       |
| - scripts/tiered-verify.js (Fail-Closed 3단계: SKIPPED/QUICK/FULL)       |
| - scripts/check_vault.js (인덱스 패리티, Raw 인용, 해시 도달성 검증)      |
| - scripts/inventory.js (실행 코드 기반 도구/에이전트 인벤토리)           |
| - scripts/sync-version.js (버전 SSOT 드리프트 차단)                     |
| - 지식 볼트: index.md (목차), wiki/ (지식), raw/ (근거 데이터)          |
+-------------------------------------------------------------------------+
```

## 컴포넌트 및 파일 매핑 (Allowlist SSOT)

006 하네스의 모든 실행 파일과 핵심 규칙은 아래 매핑에 속해야 하며, 여기에 속하지 않는 파일은 `reviewer`의 Zombie 잔재 / Scope 오염 검증 대상이 된다.

| 계층 | 컴포넌트 | 담당 역할 | 소스 파일/경로 |
|---|---|---|---|
| **1계층** | Conductor | 주 조율자 (직접 편집 불가, 위임 전담) | `opencode.json` |
| **1계층** | Force Delegation | Conductor 직접 실행 차단 가드 | `plugins/force-delegation.js` |
| **2계층** | Interpreter | 일기장 프롬프트 → 정형 스키마 변환 | `skills/interpreter/SKILL.md` |
| **2계층** | Schema Validator | Lock 스키마 문법 및 무결성 검증 | `scripts/validate-schema.js` |
| **2계층** | Reviewer | FULL 티어 변경 자문 (Plan/Final) | `skills/reviewer/SKILL.md` |
| **3계층** | Verify Agent | 기계적 테스트/린트 수행 에이전트 | `skills/verify/SKILL.md` |
| **3계층** | Tiered Gate | 변경 크기 기반 3단계 게이트 판정 | `scripts/tiered-verify.js`, `scripts/verify-tiered.js` |
| **3계층** | Vault Linter | 위키-원천 근거 무결성 강제 | `scripts/check_vault.js` |
| **3계층** | Inventory | 런타임 가용 에이전트/툴 코드 감사 | `scripts/inventory.js` |
| **3계층** | Version Sync | 루트 package.json 마스터 동기화 | `scripts/sync-version.js` |
| **3계층** | Arch Renderer | md 핵심(계층+Changelog)만 html로 뽑는 단방향 생성기 | `scripts/sync-architecture.js` |
| **2계층** | Canvas Mirror | md 거울 plus 스티키 접수함 (mirror/view+inbox, Echo 게이트 필수) | `skills/excalidraw/SKILL.md` |
| **—** | Canvas Mirror/View | 루트 거울 plus 접수함 (pack-excluded, regen 대상, tier FULL 트리거) | `architecture.excalidraw`, `architecture.html` |
| **3계층** | Vault | 정형 지식 카탈로그 및 원천 증거 | `index.md`, `wiki/**`, `raw/**` |

## 아키텍처 원칙 및 좀비 코드 방지

1. **단일 진실 공급원 (SSOT)**: 본 문서 및 `wiki/architecture/`가 아키텍처의 유일한 진실(Ledger)이다. `architecture.excalidraw`는 md 기준 거울 plus 스티키 접수함(View+Inbox)으로 격하되며, `architecture.html`은 `npm run sync:architecture`로 뽑는 핵심요약 자동뷰(derived)다. 3중 SSOT drift를 막기 위해 캔버스→md 역수입은 Echo 확정 Task(`gate:echo-confirmed`)로만 허용된다.
2. **스티키는 다이어리**: 캔버스 스티키/화살표는 diary 취급이며 `guardian` 모드에서 사용자 `yes` 승인 없이는 실행 불가다. Changelog 진실은 `package.json` 버전 plus `log.md` append-only ledger이며, 캔버스 Changelog 카드는 거울 복사다.
3. **화이트리스트 규율**: 신규 유틸리티나 스크립트 추가 시 위 표의 3계층 분류에 명시적으로 등록되어야 한다. 미등록 파일은 방치된 좀비 코드로 간주되어 정리 대상이 된다. `.agents/skills/` 중복은 `inventory`/`check_vault` 사각지대이므로 금지되며 `skills/` 단일본만 유지한다.
4. **무결성 검증**: 본 문서는 `scripts/check_vault.js --strict`에 의해 인덱스 일치성, 마크다운 링크, 원천 인용이 기계적으로 상시 검증된다. 루트 `architecture.*`는 `package.json` files에서 pack-excluded이며 `AGENTS.md` Layout에 거울/view로 명시된다.
