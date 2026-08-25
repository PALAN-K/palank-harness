# Guard Depth & Version SSOT

Vault-Base: git:7fdee0648ab689230460c0d927b5c59656bacec3

> Raw: raw/notes/guard-depth-version-ssot.md

## 요약

2026-08-26 수리 라운드(v3.2 감사 후속). 방어 깊이 회복(bash Layer 1 완성), 유령 플러그인의
npm 고정·활성화, check_vault 링크 게이트, 버전 단일 소스(sync-version.js)를 한 배치로 정착했다.
모든 주장은 당일 프로브 실측으로 뒷받침된다(Raw 참조).

## 4가지 결정

1. **bash Layer 1 완성** — conductor.permission에 `bash: {"*":"deny"}` 추가(객체형 통일).
   재프로브에서 해석 설정에 그대로 반영됨을 확인. Layer 1(설정)·2(플러그인)·3(프롬프트) 중
   설정층이 이제 write/edit/bash 전부 커버한다.
2. **플러그인 공급망 고정** — 무버전 owner/repo spec은 에러 없이 관성이 됨을 실측
   (normal ≡ --pure, 빈 클론 캐시). `opencode-dynamic-subagents@0.3.1`로 교체하자
   dsa-* 서브에이전트 12개가 생성됐다. 함정 7번으로 등록.
3. **write 키 제거** — 공식 Permissions 문서: `edit`이 edit/write/patch 전부 포괄.
   중복 키는 삭제하고 replication-checklist의 "유지 중" 표기를 종결.
4. **버전 SSOT** — scripts/sync-version.js: 마스터=root package.json, 라이브 대상만
   명시 배열로 동기화(mcp manifests + lockfile, AGENTS/README H1, description).
   log.md 역사와 wiki/raw 출처 라벨은 구조적으로 제외. `check:version`이 verify 체인 편입.

## explore/general 태스크 키 — 의도적 참조 (P1-2)

conductor.task 맵의 두 키는 잔재가 아니라 설계다:

- `explore: allow` — opencode 빌트인 리서치 전용 서브에이전트(General·Explore·Scout 중 하나).
  Rule 5의 "research-only lookups" 레인. Echo 게이트는 대상 무관 모든 Task 프롬프트에
  fail-closed 적용되므로 explore가 확인 없는 위임의 우회로가 되는 일은 없다.
- `general: deny` — 미래 버전이 범용 서브에이전트를 추가·확장해도 인터프리터 흐름 밖에서
  build형 작업을 받지 못하게 하는 선제 가드(fail-closed 기본값). 확대가 필요해지면
  설정 변경 + log.md 감사 항목이라는 명시적 절차를 거친다.

## 검증법

- `npm run verify` — lint + check:vault(Raw·패리티·해시 도달성·링크 대상) + test +
  check:version + pack --dry-run.
- 프로브: `opencode debug config`에서 conductor bash=deny 확인,
  `--print-logs`에서 failed-to-load 부재 + dsa-* 12개 생성 확인.

## 참조

- `raw/notes/guard-depth-version-ssot.md` — 실측 원문(스냅샷 경로·설치 위치·스윕 결과)
- `raw/notes/replication-checklist.md` / `wiki/references/replication-guide.md` — 함정 7번·task 맵 근거 반영
- `scripts/sync-version.js` — 버전 SSOT 구현(TARGETS 허용 목록)
