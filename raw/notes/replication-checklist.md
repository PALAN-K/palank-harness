# Replication Checklist — palank-harness v3.2 복제 체크리스트 (상세판)

날짜: 2026-08-25
적용: v3.2.0 기준 범용(generic) 체크리스트 — 하네스를 다른 프로젝트/머신으로 복제할 때 전 단계 적용

## 최상단 조항 — 복제 금지

**출발지가 아래 0단계 자격을 갖추지 못했으면 복제를 시작하지 않는다.**

근거: "green tests, dead guard" 사건(P0, log.md v3.2 엔트리). v3.1 가드는 유닛 테스트
100% 통과에도 런타임에서 단 한 번도 작동하지 않았다 — 초록불 테스트만으로는 배선(wiring)을
검증할 수 없다. 죽은 가드를 복제하면 죽은 가드가 늘어날 뿐이다.

## 0단계 — 출발지 자격 확인 (복제 전 필수)

- [ ] `npm run verify` 전 게이트 PASS — lint + check:vault --strict + test + check:version + pack --dry-run
- [ ] `opencode debug config --print-logs` 출력에 "failed to load plugin" **없음**
      (P0 교훈: 플러그인 로더가 에러를 흡수해도 테스트는 녹색일 수 있다)
- [ ] 수동 프로브 최소 1·2·3번 통과 이력 — 프로브 7종 목록은 log.md [2026-08-25] docs 엔트리

## 1단계 — git 이력 포함 복제

- 권장: `git clone`(또는 `git bundle`)로 **이력 포함** 복제 → 모든
  `Vault-Base: git:<hash>`의 도달성(`git cat-file -e <hash>`)이 그대로 유지된다.
- git 없이 파일만 복제하는 경우: 모든 Vault-Base 해시를 재발급하거나 해당 라인을 삭제한다.
  그렇지 않으면 strict check:vault가 적색.
  (P1-7 교훈: check_vault의 검사는 "drift 검증"이 아니라 **해시 도달성**만 확인한다.)

## 2단계 — 자산 복사

- 리포 자산: AGENTS.md, opencode.json, skills/, scripts/, plugins/, mcp/(node_modules 제외),
  tests/, package.json, index.md, README.md, log.md
- 리포 밖 전역 자산 별도 확인: `~/.config/opencode/` 하위(슬래시 커맨드, 전역 AGENTS.md 등).
  복제 대상 머신에 **수동 이식 필요**. 실태 확인법: 대상 머신에서 opencode 설정 디렉터리 점검.
- 커밋 금지 파일: `.opencode-inventory.json`(머신별 상이 by-design, .gitignore 등재),
  mcp/node_modules

## 3단계 — opencode.json 재지정 (머신/프로젝트 종속 4곳)

1. relay baseURL — 이 프로젝트 전용 값 → 대상 환경 값
2. model ID 4종 + small_model 재매핑
3. 외부 plugin 채용 재판단 — v3 코어 아님. **채용 시 npm 버전 고정 필수**
   (현재: `opencode-dynamic-subagents@0.3.1`. 무버전 owner/repo spec은 조용히 관성이 된다 —
   2026-08-26 실측: normal ≡ --pure 프로브, 빈 클론 캐시. 함정 목록 7번)
4. mcp 상대경로 스폰(`node mcp/server.js`)의 cwd 런타임 확인
5. conductor.permission/task 맵 보존 — `edit:"deny"`+`bash:{"*":"deny"}`(Layer 1 완성),
   task 키는 의도적 참조: `explore: allow`(빌트인 리서치 전용 서브에이전트 — Rule 5의
   research-only 레인; Echo 게이트가 모든 Task 프롬프트에 보편 적용되므로 우회 레인이 될 수 없음.
   실측: `opencode debug agent explore` resolve 확인, 2026-08-26) / `general: deny`(미래 버전의
   범용 에이전트가 인터프리터 흐름 밖 build형 작업을 받지 못하게 하는 선제 가드, fail-closed 기본).
   확대는 설정 변경 = log.md 감사 항목 동반.
- 완료(2026-08-26): 무효 키 `write:"deny"` 제거 — 공식 Permissions 문서 실증상 `edit`이
  write/patch를 포괄("edit — all file modifications (covers edit, write, patch)").

## 4단계 — 설치·재생성

- `cd mcp && npm install`
- `npm run inventory` 재생성 — 머신별 결과 상이 by-design(커밋 금지, .gitignore 등재)

## 5단계 — 대상 프로젝트화

- package.json: name/description 교체, engines 필드 유지 또는 대상에 맞게 재산정(값과 근거 기입),
  version은 0.x로 리셋 권장
- wiki/·raw/ 초기화: **빈 볼트는 유효한 PASS 스켈레톤**(check_vault 설계상) —
  대상 프로젝트 지식으로 재시드한다
- index.md 재작성(패리티: wiki 페이지 수 == index 불릿 수)

## 6단계 — 검증

- `npm run verify` PASS
- `npm run check:version` — 라이브 버전 토큰(mcp manifests, AGENTS/README H1, description)이
  루트 package.json 마스터와 동기됐는지 기계 검사(2026-08-26 신설; scripts/sync-version.js)
- 수동 프로브(log.md [2026-08-25] docs 엔트리의 7종) 중 **최소 5종**, 특히:
  무마커 Task 차단(2번), conductor 직접 write 차단(4번), rm 차단(6번)

## 7단계 — 첫 복제 검증 후 군 복제

- 첫 복제본에서 전 프로브 통과 → 동일 절차로 확산한다. **첫 복제본이 검증기다.**

## 함정 목록 (실측 기반)

1. git 없는 복제 → strict vault 적색(Vault-Base 해시 미도달)
2. `sc` 별칭 차단이 Windows sc.exe(서비스 제어)와 오탐 충돌 — 수용된 한계
   (plugins/force-delegation.js 주석)
3. Node 버전: node --test glob 인수(v21.0.0 도입) + ESM 요구 — package.json engines 참조,
   실측은 v24
4. Windows: 공백 경로(import.meta.url 기반 처리됨), PowerShell 5.1
5. inventory 캐시(.opencode-inventory.json) 커밋 금지
6. check_vault는 "drift 검증"이 아니다 — 해시 도달성만 확인(명칭 주의, P1-7)
7. 무버전 owner/repo 플러그인 spec은 에러 없이 **관성**이 된다 — 2026-08-26 실측
   (빈 클론 캐시 + normal≡--pure 프로브). npm `name@version` 고정만이 로드를 보증한다.

## 참조

- `wiki/references/replication-guide.md` — 요약 페이지(볼트)
- `log.md` — P0/P1 교훈 원문과 수동 프로브 7종 목록
