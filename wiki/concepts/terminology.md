# Terminology — replication / distribution / scaffold, foundry / harness 분리

Vault-Base: git:eec033ece6719679fa8b3dc465eef3d1fedbc663

> Raw: raw/notes/glossary.md

## 요약

palank-harness thin v3.2에서 혼동되는 5대 용어를 1표로 분리한다. replication(1회 복제 행위) ≠ distribution(군 확산·권한 분배 체계) ≠ scaffold(지식 뼈대), foundry(공장·원천) ≠ harness(일회용 실행기). 경로 별칭 4종(`REPO_ROOT`/`HARNESS_ROOT`/`ROOT`/`VAULT_ROOT`)은 Add not Remove로 호환 유지된다 — 기존 설치본은 `cp -a` 재복제만으로 무파손.

## 5행 분리표

| 용어 | 영문 | 역할 / 정의 | 대조 — 무엇이 아닌가 | 이식 시 함정 |
|---|---|---|---|---|
| 복제 | replication | 출발지를 `git clone/bundle`(이력 포함)로 받아 `cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/` 를 대상 루트로 복사하는 1회 행위. `Vault-Base` 해시 도달성 유지가 완료 조건. 0단계 자격 미충족 시 복제 금지(P0). | distribution(군 확산)이 아니다 — replication은 1회 복사 행위 자체. | git 없이 파일만 복사하면 strict `hash unreachable` 적색. 전역 `~/.config/opencode/` 수동 이식 누락도 빈번. |
| 분배 | distribution | 복제된 하네스를 N곳으로 확산시키는 권한·설정 분배 체계. Global(`~/.config/opencode/opencode.json` `permission.bash` 5종) + Project(`opencode.json` Top-level 5종) 이중 오버레이로 `git stash*/reset*/checkout*`/`npm run verify*`/`npm run check:version*` 를 `allow` 해 pilot/oneshot `ask` 마찰 제거(foundry distribution). | foundry(공장 주체)도 `npm publish` 배포도 아니다. | Global/Project 오버레이를 1곳만 수정하면 pilot이 ask에서 멈춘다. `opencode debug config` 로 5종 `allow` 확인 필요. |
| 비계 | scaffold | 지식·검증 뼈대: `raw/`(immutable 원천) / `wiki/`(매 페이지 Raw 인용 필수) / `index.md`(1 line/page) / `log.md`(append-only). 빈 볼트(0 pages, 0 rows)도 PASS 스켈레톤. `Harness disposable, spec is asset — foundry는 비계`에서 비계가 이것. | harness(실행기)가 아니다 — 스캐폴드는 남고 하네스는 버려져도 재생. | `raw/` 를 편집하거나 Raw 인용 누락 시 `check:vault --strict` 즉시 FAIL. `index.md` 패리티 불일치도 동일. |
| 공장 | foundry | 하네스를 찍어내는 원천·파이프라인 — 본 리포(006 palank-harness) + `github:PALAN-K/palank-harness` upstream + 코어 자산(`AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/`). 업데이트는 `git fetch upstream` → 코어 5곳 병합 / 보호 경로 3곳 보존. | harness(찍혀 나온 인스턴스)가 아니다 — foundry는 제조 라인. | `opencode.json` 머신 값(relay·model)이나 `wiki/`/`raw/` 를 upstream으로 덮어쓰면 프로젝트 지식·접속 수단 유실. |
| 하네스 | harness | opencode 위 투명래퍼 인터프리터 — Listen→Echo→Interview→Lock→최적 호출, `echo:{summary,confirmed:true}` 타입+코드 강제, 3-layer 위임·tiered verify. 인스턴스별 일회용 실행기이며 3 agents(`conductor`/`interpreter`/`verify`)가 계약. | scaffold(뼈대)도 foundry(공장)도 아니다 — 하네스는 공장이 찍은 결과물. | `.opencode/agent/*.md` 수동 생성·`harness-bootstrap`·`opencode init` 은 오염. `python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"` 로 정리 후 `npm run inventory --refresh`. |

## 경로 별칭 — Add not Remove (P0)

| 별칭 | 표준/별칭 | 위치 | 기존 설치본 영향 |
|---|---|---|---|
| `REPO_ROOT` | 표준 | `mcp/server.js`, `scripts/inventory.js`, `scripts/tiered-verify.js` | 신설 표준명. 구 `HARNESS_ROOT`/`ROOT`는 그대로 유지되어 외부 참조가 깨지지 않음. |
| `HARNESS_ROOT` | `REPO_ROOT` alias | `mcp/server.js` (`const HARNESS_ROOT = REPO_ROOT`) | 기존 코드가 `HARNESS_ROOT`를 쓰던 경우 무수정 동작. |
| `ROOT` | `REPO_ROOT` alias | `scripts/inventory.js`, `scripts/tiered-verify.js` (`const ROOT = REPO_ROOT`) | 동일. |
| `VAULT_ROOT` | `vaultDir` alias | `scripts/check_vault.js` (`const VAULT_ROOT = vaultDir`) | `vaultDir` 직접 사용 코드 무영향. thin에서 `VAULT_ROOT == REPO_ROOT` 일 수 있으나 논리 분리. |
| `project` (SDK) | SDK 핸들 | `plugins/force-delegation.js` B-1 주석 `project ≠ repo/vault/instance` | 명명 충돌 방지 주석. 혼동 금지. |

재복제는 `cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ ~/projects/<target>/` 덮어쓰기만으로 무파손. 수동 마이그레이션 불필요.

## 검증법

- `npm run verify` = lint + `check:vault --strict`(Raw 인용·패리티·해시·링크) + test + `check:version` + `pack --dry-run`. 이 문서 자체가 Raw 인용 + `Vault-Base` + `index.md` 패리티로 검증된다.
- 별칭 무파손 검증: `rg "REPO_ROOT|HARNESS_ROOT|VAULT_ROOT" mcp/server.js scripts/*.js plugins/*.js` — 각 파일에 `REPO_ROOT` 표준 + 구 별칭 alias가 동시에 존재함을 확인.
- 프로브: 기존 설치본에서 재복제 후 `npm run verify` PASS + `opencode debug config --print-logs` 에 `failed to load plugin` 부재 + 무마커 Task 차단 유지.

## 참조

- `raw/notes/glossary.md` — 상세판(Raw, 7절, 별칭 4종 표 포함)
- `raw/notes/replication-checklist.md` — 복제 0~7단계 상세
- `wiki/references/replication-guide.md` — 7단계 요약
- `raw/notes/v3-charter.md` — foundry/harness 비유 출처
- `skills/verify/SKILL.md` — scaffold 정의(dual-ledger)
- `AGENTS.md` — thin 헌법(용어 불혼용 규율)
