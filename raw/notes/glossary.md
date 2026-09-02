# Glossary — palank-harness v3.2 용어집 (Raw 상세판)

날짜: 2026-09-02
범위: palank-harness v3.2 thin 헌법·복제·파운드리 분배 전반에서 혼동되는 5대 용어 + 경로 별칭 4종
근거: AGENTS.md v3.2, wiki/references/replication-guide.md, raw/notes/replication-checklist.md, raw/notes/v3-charter.md, plugins/force-delegation.js B-1, mcp/server.js REPO_ROOT, scripts/inventory.js ROOT alias

## 1. replication (복제)

- **정의**: 출발지 저장소를 `git clone` 또는 `git bundle`로 이력 포함 복제하고, 리포 자산(`AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/`, `tests/`, `package.json`, `index.md`, `README.md`, `log.md`)과 전역 자산(`~/.config/opencode/` 하위)을 대상 머신/프로젝트로 `cp -a` 복사하는 행위. 모든 `Vault-Base: git:<hash>`의 `git cat-file -e <hash>` 도달성을 유지한다.
- **범위**: 소스 → 타깃 1회 복사. 출발지 0단계 자격(`npm run verify` PASS + `failed to load plugin` 부재 + 프로브 1·2·3 통과) 미충족 시 복제 금지.
- **검증**: `npm run verify` + `opencode debug config --print-logs` + 수동 프로브 7종 중 최소 5종(2·4·6 필수).
- **혼동 금지**: distribution과 다르다 — replication은 "복사 행위 자체", distribution은 "복제된 결과물을 군(여러 타깃)으로 확산하는 파이프라인/권한 분배"다.

## 2. distribution (분배/배포)

- **정의**: 복제된 하네스를 여러 프로젝트/머신으로 확산시키기 위한 권한·설정 분배 체계. v3.2에서 구체화: Global(`~/.config/opencode/opencode.json`의 `permission.bash` 5종 `allow`) + Project Template Top-level(`opencode.json` `permission.bash` 5종 `allow`)의 이중 오버레이. `git stash*`/`git reset*`/`git checkout*`/`npm run verify*`/`npm run check:version*` 허용으로 pilot/oneshot 자동화의 `ask` 마찰을 제거.
- **범위**: 1회 replication의 후속 단계(군 복제). 첫 복제본이 검증기(전 프로브 통과)임을 확인한 후 동일 절차로 확산.
- **혼동 금지**: foundry(공장)가 distribution을 수행하는 주체, replication은 그 수단. `npm publish` 의미의 배포가 아니다.

## 3. scaffold (스캐폴드/비계)

- **정의**: 지식·하네스 운용을 떠받치는 최소 구조물. verify SKILL 1절 정의: `raw/`(immutable, 절대 편집 금지, provenance 원천) / `wiki/`(LLM-owned, 매 페이지 `> Raw: raw/...` 인용 필수) / `index.md`(1 line/page, 세션이 가장 먼저 읽는 카탈로그) / `log.md`(append-only 감사 장부) — 네 파일의 atomic dual-write 규율. `wiki 0 && index 0`은 유효한 PASS 스켈레톤.
- **범위**: 하네스 이전·이후에도 남는 자산. `Harness disposable, spec is asset — foundry는 비계`에서 "비계"가 바로 scaffold.
- **혼동 금지**: 하네스(실행기)가 아니다. 스캐폴드는 "지식·검증 뼈대", 하네스는 "그 뼈대 위에서 일하는 인터프리터·가드".

## 4. foundry (파운드리/공장)

- **정의**: 하네스를 찍어내는 공장 — 본 저장소(006 palank-harness) 자체와 그 복제·분배 파이프라인을 가리킨다. 스캐폴드(scaffold)를 유지·제조하는 주체이며, `opencode.json` provider/model registry, `scripts/`, `plugins/`, `skills/`, `mcp/` 등 코어 자산을 공급한다. 모델 교체·하네스 폐기 시에도 스캐폴드(spec·vault)는 foundry를 통해 재생성된다.
- **범위**: Upstream 원천(`github:PALAN-K/palank-harness`) + 업데이트 동기화 절차(`git remote add upstream` → 병합 대상 코어 5곳 / 보호 경로 3곳).
- **혼동 금지**: harness와 다르다 — foundry는 "공장·제조 라인", harness는 "공장이 찍어낸 인스턴스(투명래퍼 인터프리터)".

## 5. harness (하네스)

- **정의**: opencode 위에 얹는 투명래퍼 인터프리터. Listen → Echo → Interview → Lock → 최적 opencode 호출로 일기체 요구를 스키마화·위임한다. Echo 게이트(`echo:{summary,confirmed:true}` 타입+코드 강제), 3-layer 강제 위임(설정·플러그인·프롬프트), tiered verify(FULL/QUICK/SKIPPED) 등이 코어.
- **범위**: 인스턴스별 실행기. `AGENTS.md` thin 헌법(8줄 레이아웃, 6대 규칙)과 `opencode.json` 3 agents(`conductor`/`interpreter`/`verify`)가 하네스의 계약.
- **수명**: Disposable — 언제든 버리고 foundry에서 재복제 가능. 지식 자산은 vault(scaffold)에 남으므로 하네스 교체로 유실되지 않는다.
- **혼동 금지**: foundry(공장)가 아니다. 혼용 시 "공장을 이식한다"는 표현이 "하네스 인스턴스를 복제한다"와 섞여 권한·경로 오해를 만든다.

## 6. 경로 별칭 4종 (P0 alias, Add not Remove)

| 별칭 | 정의 | 위치 | 호환성 |
|---|---|---|---|
| `REPO_ROOT` | 단일 리포 루트 — thin 레이아웃에서 harness/vault/instance 3 역할을 겸함. `path.resolve(__dirname,"..")`로 계산. | `mcp/server.js`, `scripts/inventory.js`, `scripts/tiered-verify.js` | 신설 표준명. 구 `HARNESS_ROOT`/`ROOT`는 alias로 유지되므로 기존 설치본 import/참조가 깨지지 않음. |
| `HARNESS_ROOT` | `REPO_ROOT`의 alias — 호환 유지용. `const HARNESS_ROOT = REPO_ROOT` | `mcp/server.js` | 외부에서 `HARNESS_ROOT`를 import/참조하던 코드는 그대로 동작. 제거 금지(Add not Remove). |
| `ROOT` | `REPO_ROOT`의 alias — 호환 유지용. `const ROOT = REPO_ROOT` | `scripts/inventory.js`, `scripts/tiered-verify.js` | 동일. |
| `VAULT_ROOT` | vault 루트 — `vaultDir = path.resolve(vaultArg)` 로 도출. thin 레이아웃에서 `VAULT_ROOT == REPO_ROOT` 일 수 있으나 논리적으로 별개(검사 대상 디렉터리 vs 실행기 루트). `const VAULT_ROOT = vaultDir` | `scripts/check_vault.js` | 신설 alias. 기존 코드가 `vaultDir`를 직접 쓰므로 영향 없음. 재복제 시 덧씌우기만으로 확장. |
| `project` (SDK) | opencode SDK의 project 핸들(`{project,client,$,directory,worktree}`) — 위 4종과 무관. | `plugins/force-delegation.js` B-1 주석 | 명명 충돌 방지용 주석 분리. `REPO_ROOT`/`VAULT_ROOT`/`instance root`와 혼동 금지. |

별칭 전략은 Add not Remove — 기존 설치본이 `HARNESS_ROOT` 또는 `ROOT`로 고정해 둔 스크립트·외부 참조가 있어도, 신규 `REPO_ROOT`를 표준으로 도입하되 구 별칭을 그대로 export/유지한다. 재복제 시 `cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/` 덮어쓰기만으로 무파손 확장된다.

## 7. 상호 대조 요약

- replication(행위) vs distribution(확산 체계): replication이 1회 복사, distribution이 N곳 군 확산 + 권한 오버레이.
- scaffold(뼈대) vs foundry(공장) vs harness(인스턴스): scaffold는 지식 뼈대, foundry는 뼈대·하네스를 제조하는 공장, harness는 공장이 찍어낸 일회용 실행기.
- 모든 용어는 `npm run verify`와 `Vault-Base` 해시 도달성으로 기계 검증된다 — 프롬프트 암시가 아니라 게이트가 강제한다.

## 참조

- `wiki/concepts/terminology.md` — 요약 페이지(볼트, 5행 표)
- `raw/notes/replication-checklist.md` — 복제 0~7단계 원문
- `raw/notes/v3-charter.md` — v3 6대 철학(foundry/harness 비유 출처)
- `AGENTS.md` — thin 헌법(용어 불혼용 규율)
- `plugins/force-delegation.js` B-1 — SDK Project 분리 주석
