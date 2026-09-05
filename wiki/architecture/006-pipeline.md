# 006 Pipeline — Diary to Verify Flow

Vault-Base: git:b14f1bbcfd574590a6cd13b5b662fa3e994bca2e

> Raw: raw/notes/v3-charter.md

## 요약

사용자의 자연어(일기장 수준의 모호한 프롬프트)가 어떻게 엄격한 정형 스키마로 변환되고, 기계적 게이트를 거쳐 안전하게 실행·검증되는지 정의한 실행 파이프라인 SSOT 문서이다.

## 전체 실행 흐름 (Execution Pipeline)

```text
[사용자 입력 (일기장 프롬프트)]
           │
           ▼
[0. Mode 판정] ─── (키워드 매핑: guardian / pilot / kamikaze)
           │
           ▼
[1. Listen] ────── (원문 캡처, 모델 추측 금지)
           │
           ▼
[2. Echo] ──────── (일상어 요약 제시: 작업 X, 범위 Y, 결과 Z)
           │       - guardian: "yes" 승인 대기
           │       - pilot/kamikaze: auto-confirmed 합성
           ▼
[3. Interview] ─── (결정론 체크리스트 {intent, scope/files, done})
           │       - architecture 문서 참조로 질문 없이 파일 즉시 확정 (Zero-Interview)
           ▼
[3.5 Tier 판정] ── (tiered-verify.js --check -> SKIPPED / QUICK / FULL)
           │
           ▼
[3.6 Review] ───── (reviewer/SKILL.md: FULL이면 Plan/Final 자문)
           │
           ▼
[3.7 Snapshot] ─── (pilot/kamikaze 전용: git stash 또는 pilot 분기 생성)
           │
           ▼
[4. Lock] ──────── (validate-schema.js: echo.confirmed 필수 정형 검증)
           │
           ▼
[5~7. Classify·Read·Translate] ── (AGENTS.md -> index.md -> wiki/raw 3-layer)
           │
           ▼
[8. Dispatch] ──── (Task 위임 + gate:echo-confirmed 마커 선언)
           │       - Conductor는 직접 쓰지 않고 오직 Task로만 위임
           ▼
[9. Verify] ────── (기계적 검증 수행)
                   - SKIPPED: sidecar 증거 확인
                   - QUICK: npm run verify:quick (lint + vault + test)
                   - FULL: npm run verify (전체 + sync-version + pack)
                   - pilot 모드: 실패 시 자동 롤백 또는 최대 3회 retry
```

## 아키텍처 SSOT와의 상호작용 (Zero-Interview 효과)

1. **맥락 고정 (Read)**:
   - 인터프리터는 `index.md`의 카탈로그를 통해 [006-overview.md](wiki/architecture/006-overview.md)를 상시 인지한다.
2. **질문 없는 파일 확정 (Interview 생략)**:
   - 사용자가 *"인터프리터 스키마 검증 쪽 고쳐줘"*라고 일기처럼 말해도, 인터프리터는 2계층 표를 대조하여 즉시 `scripts/validate-schema.js` 및 `skills/interpreter/SKILL.md`로 파일 목록을 확정한다.
3. **캔버스 접수함 (Sticky Inbox as Diary)**:
   - `architecture.excalidraw` 스티키/화살표는 diary 원문으로 캡처되며 Interview 생략 사유가 되지 않는다. 실행은 항상 Echo 요약 plus 사용자 확인(`guardian`은 `yes` 대기) plus Lock(`echo.confirmed:true`) plus `gate:echo-confirmed` Task를 거친다. md→html은 `npm run sync:architecture` 단방향 렌더이며, 캔버스→md 역수입은 Echo 확정 Task로만 허용된다.
4. **좀비 코드 및 스코프 오염 방지 (Review)**:
   - 리뷰어는 변경된 파일이 3계층 아키텍처 표에 정의된 역할과 일치하는지 검토하며, 표에 없는 곁가지 파일이 추가되면 `Zombie 잔재` 또는 `Scope 오염` finding으로 경고한다.
