# Visual Architecture Schema Dogfooding — 결정 및 계획 기록 (2026-09-05)

> gate:echo-confirmed — echo:{summary:"Visual Architecture Schema를 vault-native + advisory + 도그푸딩만 + md 수기 SSOT로 확정하고 006 자체 3계층 아키텍처를 wiki/architecture에 이식", confirmed:true}
> Locked: intent=Visual Architecture Schema Dogfooding 확정 및 006 SSOT 구축 / done=wiki/architecture 2문서 생성 + index.md 패리티 + brainstorm 기록 + architecture.html 뷰어 + log.md 갱신

## 1. 배경 및 브레인스토밍 경과

- 사용자 요구: 바이브코딩 시 백엔드 직관 상실 방지, 시스템 파이프라인 시각화, 좀비 코드 및 곁가지 색출 기준 확보(Allowlist SSOT).
- 원안 검토(7대 맹점 발견):
  1. SSOT 3중화 (.excalidraw vs .html vs .json/.md drift 위험)
  2. 두 개의 지도 충돌 (index.md vs Tier-0 아키텍처 지도)
  3. Allowlist vs Zero-Friction 자기모순 (QUICK 면제 시 좀비 증식)
  4. Excalidraw JSON 파서의 취약성 (좌표·동의어 파싱 고장 위험)
  5. 게이트 중복 (check_vault + tiered-verify + reviewer 교집합)
  6. HTML의 grep/diff 적대성
  7. foundry 템플릿 배포 경로 오류 (pack 제외)

## 2. 확정 방향: vault-native + advisory + 도그푸딩만 + md 수기 SSOT

| 축 | 결정 | 근거 |
|---|---|---|
| **SSOT** | `wiki/architecture/*.md` (수기 작성) | `> Raw:` + `Vault-Base:` + `index.md` 패리티를 그대로 상속. git diff/ripgrep 100% 지원. |
| **시각화** | `architecture.html` (동반 뷰어) | 인간의 시각적 직관용 렌더링 산출물로 격하 (게이트 검사 비대상). |
| **게이트** | 신규 스크립트 없음 (0-code) | `reviewer`의 Checklist (Zombie 잔재 / 4-anchor) advisory 힌트로 소비. |
| **추출기** | 파서 없음 | 인터프리터는 기존 Read 3-layer(`index.md` → `wiki/`) 경로로 md를 직접 독해. |
| **범위** | 006 자체 도그푸딩 1배치 | 실측 drift 3회 이상 발생 시에만 mechanize 검토 (YAGNI). |

## 3. 이번 배치 산출물

1. `wiki/architecture/006-overview.md` — 006 하네스 3계층 아키텍처 SSOT
2. `wiki/architecture/006-pipeline.md` — Diary→Echo→Interview→Lock→Dispatch→Verify 실행 흐름 SSOT
3. `index.md` — architecture 헤더에 2개 bullet 연결 (check_vault 패리티 준수)
4. `architecture.html` — 브라우저에서 바로 열리는 006 3계층 단일 뷰어 (인간용 직관)
5. `log.md` — 결정 사항 기록
