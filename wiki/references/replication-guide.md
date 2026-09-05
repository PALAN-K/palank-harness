# Replication Guide

Vault-Base: git:423ff5d3ffeed29a7c85339d36831913a0d70471

> Raw: raw/notes/replication-checklist.md

## 요약

v3.2 신설. palank-harness를 다른 프로젝트/머신으로 복제하는 표준 절차.
**출발지 자격(0단계)을 갖추지 못한 복제는 금지**다 — "green tests, dead guard"(P0)처럼
테스트가 녹색이어도 가드가 죽었으면 그 결함까지 복제된다.

## 복제 금지 조건 (0단계)

아래 중 하나라도 충족되면 복제 금지:

- `npm run verify` 미통과
- `opencode debug config --print-logs`에 "failed to load plugin" 존재
- 수동 프로브 1·2·3번(배선 확인·무마커 Task 차단·마커 Task 통과) 통과 이력 없음
  — 목록: log.md [2026-08-25] docs 엔트리

## 7단계 요약

| 단계 | 이름 | 핵심 |
|---|---|---|
| 1 | git 이력 포함 복제 | clone/bundle 권장 — Vault-Base 해시 도달성 유지 |
| 2 | 자산 복사 | 리포 자산 + `~/.config/opencode/` 전역 자산 수동 이식; inventory·node_modules 제외 |
| 3 | opencode.json 재지정 | relay baseURL · model ID 1종(muse-spark-1.2-contributor)+deep/fast variants · 외부 plugin은 npm 버전 고정(`opencode-dynamic-subagents@0.3.1`) · MCP cwd |
| 4 | 설치·재생성 | `cd mcp && npm install`, `npm run inventory` 재생성 |
| 5 | 대상 프로젝트화 | name/description/engines 정비, 빈 볼트 재시드, index 재작성 |
| 6 | 검증 | `npm run verify` + 수동 프로브 7종 중 최소 5종(2·4·6번 필수) |
| 7 | 군 복제 | 첫 복제본 전 프로브 통과 후 확산 |

## 함정 7종 (실측 기반)

1. git 없는 복제 → strict vault 적색(해시 미도달)
2. `sc` 별칭 차단 ↔ Windows sc.exe 오탐 — 수용된 한계
3. Node 버전 — node --test glob(v21+)·ESM, engines 참조, 실측 v24
4. Windows 공백 경로(import.meta.url 처리)·PS 5.1
5. inventory 캐시 커밋 금지
6. check_vault는 drift 검증이 아니라 해시 도달성만 확인(P1-7)
7. 무버전 owner/repo 플러그인 spec은 에러 없이 관성이 된다(2026-08-26 실측) — npm `name@version` 고정 필수

## 검증법 (FULL한정 6단 고정 — QUICK·SKIPPED는 증거조건부 경량·생략)

- `npm run verify` (FULL) 6단 고정 — 1 lint(node --check) + 2 check:vault --strict(Raw 필수·index 패리티·해시 도달성·링크 대상) + 3 test + 4 check:version(버전 SSOT) + 5 check:architecture(md-master fresh) + 6 pack --dry-run 순 발동. FULL 실패 시 공유/태그 금지 (완벽강제 아님).
- `npm run verify:quick` freeze — lint+vault+test 고정 (version/arch 제외는 일상 단축용, drift는 FULL(push/tag 전)에서 포착).
- pre-commit 훅(`scripts/pre-commit` → `scripts/verify-tiered.js` 경유): tiered `--check` CQS query-only 1회 후 SKIPPED→종료(증거 JSON, exit 0) / QUICK→`verify:quick` / FULL→`verify` (exit 1 위임, exit 2 변조 차단) 분기.
- pre-push 훅(`scripts/pre-push` → `npm run verify` 직호 FULL, tiered 경유 아님, QUICK 우회 금지).
- 훅 연결은 수동 2줄(`ln -sf ../../scripts/pre-commit .git/hooks/pre-commit`, `ln -sf ../../scripts/pre-push .git/hooks/pre-push` + `chmod +x`) — husky 미사용 zero-dep.
- 수동 프로브 7종 중 최소 5종 — 특히 무마커 Task 차단(2), conductor 직접 write 차단(4),
  rm 차단(6). 목록: log.md [2026-08-25] docs 엔트리.
- 첫복제는 untracked/빈diff로 FULL 귀결 — `npm run verify` FULL한정 필수.

## 용어 분리

- 용어 혼동은 이식 실패로 직결된다 — [terminology](wiki/concepts/terminology.md) 5행 표 참고: replication≠distribution≠scaffold, foundry≠harness, REPO_ROOT 4종 alias(Add not Remove).

## Excalidraw 이식 (thin)
- thin 복사 후 `wiki/architecture/*.md` 이식 — excalidraw는 mirror+inbox로만 취급.
- `npm run sync:architecture`로 `architecture.html` 재생성 (idempotent).
- `npm run check:architecture` fresh 확인 — `npm run verify`에 포함됨.

## 참조

- `raw/notes/replication-checklist.md` — 원본 상세판
- `raw/notes/glossary.md` — 5대 용어·별칭 상세(Raw)
- `log.md` — P0 사건과 수동 프로브 7종
- Global permission 5종(분배형 pilot 자동화): `~/.config/opencode/opencode.json`에 `git stash*`/`git reset*`/`git checkout*`/`npm run verify*`/`npm run check:version*` 허용 — `*`:`ask` 기본 유지, Project Top-level `permission.bash` 오버레이와 이중 적용(foundry distribution)
