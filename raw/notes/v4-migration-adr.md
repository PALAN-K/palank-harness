# ADR-005: v4 Migration — P2-1~P2-4 단계별 전환 계획 (Proposed)

- **Status:** Proposed (v4 Target)
- **Date:** 2026-09-02
- **Authors:** palank-harness core (interpreter/conductor)
- **Deciders:** palank-harness maintainers
- **Supersedes:** —
- **Related:** ADR-001~004 (implicit, v3 charter), commit `73992b3` (P0/P1 Add not Remove), `wiki/concepts/terminology.md`, `raw/notes/glossary.md`, `raw/notes/v3-charter.md`, `raw/notes/replication-checklist.md`
- **Vault-Base:** git:73992b32db5e32726a31f8bd0b9e59e6bc7b52f2
- **Version Target:** v4.0.0 (MAJOR, Breaking)

---

## 1. Context — 왜 P2를 v4로 보류했는가

### 1.1 완료된 선행 작업 (P0/P1, 73992b3)

`73992b3 refactor: REPO_ROOT canonical + terminology glossary (P0+P1)` 에서 파괴 없는 전이가 완료되었다.

- **P0 — REPO_ROOT 표준화 (Add not Remove):** `mcp/server.js`, `scripts/inventory.js`, `scripts/tiered-verify.js`, `scripts/check_vault.js`, `plugins/force-delegation.js` 에 `REPO_ROOT` 를 표준으로 도입. `HARNESS_ROOT` / `ROOT` / `VAULT_ROOT` / SDK `project` 는 alias·주석으로 그대로 유지. 외부 클론·npm 소비자의 기존 참조가 1바이트도 깨지지 않음을 `npm run verify` PASS 로 증명.
- **P1 — Terminology 정리:** `raw/notes/glossary.md` (상세판) + `wiki/concepts/terminology.md` (요약, vault 5/5) 추가. 5대 용어(replication/distribution/scaffold/foundry/harness) 분리, 경로 별칭 4종 표, `project ≠ REPO_ROOT/VAULT_ROOT` 분리 주석.
- **검증 결과:** `73992b3` 직후 `npm run verify` = lint + `check:vault --strict` (4/4 → 5/5) + test 51 pass + `check:version` 0 drift + `npm pack --dry-run` 전 PASS.

### 1.2 남은 파괴적 변경 4종 (P2) — 이번 ADR의 범위

P0/P1 은 alias 추가로 호환을 유지했다. 아래 4종은 alias 제거·디렉터리 분리·이름 변경을 수반하므로 **SemVer MAJOR** 에서만 허용된다. v3.x 에서는 그대로 보류하고 v4 에서 3-phase 로 제거한다.

| ID | 명칭 | 한 줄 요약 | 위험도 | Breaking |
|---|---|---|---|---|
| **P2-1** | HARNESS_ROOT 제거 | `HARNESS_ROOT` alias 완전 삭제, `REPO_ROOT` 단일 표준 | HIGH | Yes |
| **P2-2** | VAULT_ROOT 분리 | `VAULT_ROOT(=vaultDir)` 가 논리와 물리 모두에서 `REPO_ROOT` 와 분리 — thin 에서 `VAULT_ROOT == REPO_ROOT` 가정 제거 | HIGH | Yes |
| **P2-3** | `project` 리네임 | SDK `project` 핸들 + 문서 내 `project` 오남용을 `product`/`workspace` 등으로 리네임 (용어 충돌 해소) | MEDIUM | Yes (docs+SDK type) |
| **P2-4** | scaffold 분리 | `raw/`/`wiki/`/`index.md`/`log.md` 스캐폴드를 하네스 코어(`AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/`) 로부터 논리·패키징 분리 | MEDIUM | Yes (layout+pack) |

> **결정:** P2-1~P2-4 는 v4.0 에서만 수행한다. v3.x 는 `73992b3` 상태( alias 병존) 를 유지하며, v4 진입 시 본 ADR 의 Migration Phases 를 단계별로 실행한다.

### 1.3 전제 — vault 현재 상태

- vault: **5 pages / 5 index rows** (concepts 3 + topics 1 + references 1) — `npm run check:vault --strict` PASS 스켈레톤.
- 본 ADR 은 `raw/notes/` 에만 생성하므로 vault 카운트·패리티에 영향 없음 (raw 는 vault 검사 대상 아님).
- `Vault-Base` 도달성: `73992b3` 해시 포함, 모든 `Vault-Base: git:<hash>` 는 `git cat-file -e` 로 검증 가능.

---

## 2. Decision — v4 에서 3-Phase 로 단계별 수행

**P2-1~P2-4 를 v4 메이저 릴리스에서 아래 Phase 로 단계별 수행하기로 결정한다. v3.x 에서는 아무 것도 제거하지 않는다.**

- **Phase A — Warn (v3.x 마지막 minor):** deprecation 경고 추가, 마이그레이션 가이드 배포, 외부 grep 0건 확인.
- **Phase B — Dual (v4.0-alpha / next):** 신·구 동시 지원. 신 표준이 기본, 구 alias 는 호환 shim + 경고.
- **Phase C — Remove (v4.0.0):** shim·alias 제거, 단일 표준 전환, BREAKING CHANGE 릴리스 노트.

각 Phase 의 진입·퇴출 기준은 §4 Migration Phases 표를 따른다.

### Alternatives Considered

| 대안 | 기각 이유 |
|---|---|
| 지금(v3.2) 바로 제거 | 외부 클론·npm 소비자의 `HARNESS_ROOT`/`project` 참조가 깨진다. Add not Remove 원칙 위배. `73992b3` 에서 alias 로 무파손을 증명한 직후 파괴를 혼합하면 신뢰 회귀. |
| P2 영구 보류(alias 영구 유지) | 용어 혼동이 문서·코드 전반에 남는다. `terminology.md` 5대 분리 의도가 퇴색. v4 는 용어·경로 debt 를 청산할 유일한 창. |
| P2 를 v4 에서 한 커밋으로 일괄 제거 | 롤백 단위 상실, 원인 분리 불가, 검증 실패 시 전체 revert 필요. 단계별 TASK 로 쪼개야 bisect·revert 가능. |

---

## 3. Detailed Design — P2 항목별 명세

> 각 P2 는 동일한 템플릿(Goal / Background / Scope / Risk / Preconditions / TASK / Verification / Rollback) 으로 기술한다.
> TASK 블록은 **imperative 문체**이며 대괄호 헤더(`> [TASK-P2-X-Y]`) 그대로를 Task tool 프롬프트로 복사해 하달할 수 있다.

---

### 3.1 P2-1: HARNESS_ROOT 완전 제거

- **Goal:** `HARNESS_ROOT` alias 를 코드베이스에서 완전 제거하고 `REPO_ROOT` 단일 표준으로 수렴.
- **Background:** `73992b3` 에서 `mcp/server.js: const HARNESS_ROOT = REPO_ROOT` 로 alias 를 도입해 호환을 확보. v3.x 외부 설치본은 `HARNESS_ROOT` 로 고정된 스크립트가 있을 수 있다.
- **Scope (files):**

  | 파일 | 현재 상태 | v4 목표 |
  |---|---|---|
  | `mcp/server.js` | `REPO_ROOT` 표준 + `HARNESS_ROOT` alias export | alias 라인 삭제, `REPO_ROOT` 만 export |
  | `scripts/inventory.js`, `scripts/tiered-verify.js` | `ROOT = REPO_ROOT` alias 유지 | 제거 검토 (P2-1 범위는 HARNESS_ROOT지만 동반 정리 대상) |
  | `plugins/force-delegation.js` | B-1 주석에 `HARNESS_ROOT` 언급 | 주석 갱신 (alias 제거 명시) |
  | `wiki/concepts/terminology.md`, `raw/notes/glossary.md` | 경로 별칭 4종 표에 HARNESS_ROOT 포함 | 표에서 Deprecated → Removed 로 갱신, 마이그레이션 노트 추가 |
  | `README.md`, `AGENTS.md`, `raw/notes/*` | 문서 내 HARNESS_ROOT 언급 | 제거 또는 역사 기록으로 격리 |

- **Risk:** **HIGH** — 외부 클론·스크립트·CI 가 `HARNESS_ROOT` 를 import/참조 중이면 즉시 파손.
- **Breaking Change:** Yes (export 제거).
- **Preconditions:**

  1. v3.x 마지막 minor 에 deprecation warning 배포 (§4 Phase A).
  2. 외부 grep 0건 확인: `rg "HARNESS_ROOT" --hidden --glob '!node_modules' --glob '!.git'` 결과가 템플릿 외부 0건.
  3. 마이그레이션 가이드 배포: `wiki/references/migration-v3-to-v4.md` 또는 `raw/notes/migration-v3-to-v4.md` 에 치환법 명시 (`s/HARNESS_ROOT/REPO_ROOT/g`).
  4. npm consumers 에 deprecation 공지 (README, release note).

#### TASK — P2-1

> [TASK-P2-1-1] HARNESS_ROOT deprecation 경고 추가 (Phase A)
>
> - Scope: `mcp/server.js` — `HARNESS_ROOT` getter 에 `process.emitWarning('HARNESS_ROOT is deprecated, use REPO_ROOT', 'DeprecationWarning')` 또는 `console.warn` 추가 (테스트에서 스냅샷 하지 않도록 조건부).
> - Done: `node -e "import('./mcp/server.js')"` 시 경고 출력 확인, `npm run verify` PASS.
> - Verify: `rg "DeprecationWarning|deprecated" mcp/server.js`

> [TASK-P2-1-2] 외부 사용량 0건 확인 리포트 작성
>
> - 실행: `rg "HARNESS_ROOT" --hidden --glob '!node_modules' --glob '!.git' --glob '!.opencode-inventory.json' .` 및 `rg "HARNESS_ROOT" $(find ~/projects -maxdepth 3 -name opencode.json 2>/dev/null)` (수동, 결과 캡처)
> - Done: grep 결과 0건 또는 남은 참조 목록을 `raw/notes/v4-migration-adr.md` Appendix 에 기록.
> - Verify: grep 출력 캡처본 첨부.

> [TASK-P2-1-3] HARNESS_ROOT alias 제거 (Phase C)
>
> - Scope: `mcp/server.js` 에서 `export const HARNESS_ROOT = REPO_ROOT` 라인 삭제. `plugins/force-delegation.js` 주석 갱신. 문서 내 경로 별칭 표 갱신.
> - Done: `rg "HARNESS_ROOT" mcp/ scripts/ plugins/` 결과가 0건 (역사 주석 제외 시).
> - Verify: `rg "HARNESS_ROOT" mcp/ scripts/ plugins/` + `npm run verify` PASS + `node --check mcp/server.js`.

> [TASK-P2-1-4] 문서·테스트 갱신
>
> - Scope: `wiki/concepts/terminology.md` 별칭 표에서 HARNESS_ROOT 행을 `Removed in v4 (use REPO_ROOT)` 로 갱신. `raw/notes/glossary.md` 동일. `tests/` 에서 HARNESS_ROOT 단언이 있으면 `REPO_ROOT` 로 교체.
> - Done: `npm run check:vault --strict` PASS (wiki Raw 인용·패리티·링크 유지), `npm test` PASS.
> - Verify: `npm run check:vault --strict && npm test`

- **Verification (P2-1 전체):**

  ```bash
  rg "HARNESS_ROOT" --hidden --glob '!node_modules' --glob '!.git' .
  # 기대: 0건 (역사 주석·log.md 제외 시)
  npm run verify  # lint + check:vault + test + check:version + pack
  node --check mcp/server.js && node --check scripts/*.js && node --check plugins/force-delegation.js
  ```

- **Rollback:**

  - Phase A/B: `git revert <TASK-P2-1-1 commit>` — 경고만 제거, 기능 무영향.
  - Phase C: `git revert <TASK-P2-1-3 commit>` — alias 라인 1줄 복구. 외부 소비자는 `cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/` 재복제로 즉시 복구 가능 (Add not Remove 역방향).

---

### 3.2 P2-2: VAULT_ROOT 분리 (단일 VAULT 경로 모델 재정의)

- **Goal:** `VAULT_ROOT` (검사 대상 vault 디렉터리) 가 `REPO_ROOT` (하네스 실행기 루트) 와 논리·물리 모두에서 분리됨을 코드·문서·검증이 보증. thin 레이아웃(`VAULT_ROOT == REPO_ROOT`) 을 특수 케이스로 강등하고, 다중 vault / 외부 vault / detached vault 를 1급 지원.
- **Background:** 현재 `scripts/check_vault.js` 는 `vaultDir = path.resolve(vaultArg)` 로 도출하고 `const VAULT_ROOT = vaultDir` alias 를 둔다. thin 에서는 `REPO_ROOT === VAULT_ROOT` 일 수 있으나 코드가 이를 가정하면 분리 시 파손. `terminology.md` 는 이미 "thin 에서 같을 수 있으나 논리 분리" 라고 명시.
- **Scope (files):**

  | 파일 | 현재 | v4 목표 |
  |---|---|---|
  | `scripts/check_vault.js` | `vaultDir` 로직 + `VAULT_ROOT` alias, 기본값 `REPO_ROOT` | `VAULT_ROOT` 를 독립 인자/환경변수로 1급화, `REPO_ROOT` 와 다른 경로 입력 시 정상 동작 |
  | `mcp/server.js` | `REPO_ROOT` 만 인지 | vault 경로를 `VAULT_ROOT` 로 분리 전달 (필요 시 `VAULT_ROOT` env 노출) |
  | `scripts/inventory.js`, `scripts/tiered-verify.js` | `REPO_ROOT` 기반만 | vault 경로 별도 해석 (check_vault 와 동일 소스) |
  | `plugins/force-delegation.js` | 경로 무관 | 영향 없음 (문서 주석만) |
  | `wiki/*`, `raw/notes/*`, `AGENTS.md` Layout | `wiki/ + raw/ + index.md` 가 리포 루트에 있다는 가정 | vault 경로 분리 시 Layout 블록을 `REPO_ROOT` vs `VAULT_ROOT` 이중 트리로 재정의 |
  | `opencode.json`, `mcp/package.json` | vault 경로 미노출 | 환경변수 또는 `vault.path` 설정 (선택) |

- **Risk:** **HIGH** — vault 경로 분리 시 `check:vault`, `index.md` 패리티, `Vault-Base` 해시 도달성, MCP vault 조회 전부가 영향.
- **Breaking Change:** Yes (경로 가정 변경, CLI 인자·env 추가).
- **Preconditions:**

  1. 현재 vault 가 `REPO_ROOT` 와 같은 경로에서도 `VAULT_ROOT` 인자를 명시해 동작함을 증명 (Phase B dual).
  2. `wiki 0 && index 0` PASS 스켈레톤이 분리된 vault 에서도 성립.
  3. `Vault-Base` 해시 도달성 검사가 분리된 git worktree 에서도 통과.

#### TASK — P2-2

> [TASK-P2-2-1] VAULT_ROOT 명시 인자·환경변수 스펙 확정 (Phase A)
>
> - 결정: `scripts/check_vault.js` CLI 인자 `--vault <path>` 또는 `VAULT_ROOT` env 중 우선순위 정의 (예: CLI > env > REPO_ROOT fallback). 스펙을 `raw/notes/v4-migration-adr.md` 또는 `raw/notes/vault-separation-spec.md` 에 기록.
> - Done: 스펙 문서 1페이지, 예시 2종 (동일 경로 / 분리 경로).
> - Verify: 문서 리뷰, `node scripts/check_vault.js --help` (신설 시) 출력 확인.

> [TASK-P2-2-2] check_vault 듀얼 경로 지원 구현 (Phase B)
>
> - Scope: `scripts/check_vault.js` — `vaultDir` 도출 시 `process.env.VAULT_ROOT` 또는 CLI 인자를 우선. `REPO_ROOT` 와 다른 경로 입력 시 `index.md` / `wiki/**` / `raw/**` 를 해당 vault 에서 해석. `VAULT_ROOT != REPO_ROOT` 로깅 추가.
> - Done: `VAULT_ROOT=/tmp/test-vault npm run check:vault --strict` 가 해당 경로에서 PASS/FAIL 을 정상 판정. `VAULT_ROOT=. npm run check:vault --strict` 기존 동작 유지.
> - Verify: `VAULT_ROOT=. npm run check:vault --strict` PASS + `VAULT_ROOT=/tmp/empty-vault npm run check:vault --strict` PASS (0/0 스켈레톤) + `npm test` PASS.

> [TASK-P2-2-3] MCP/Inventory vault 경로 분리 전파 (Phase B)
>
> - Scope: `mcp/server.js` — vault 조회 시 `VAULT_ROOT` 사용. `scripts/inventory.js` — vault 관련 로깅 분리.
> - Done: MCP `search_wiki` / `get_context` 가 `VAULT_ROOT` 환경에서 정상 vault 를 반환.
> - Verify: `VAULT_ROOT=/tmp/test-vault node mcp/server.js` 수동 프로브 (도구 호출).

> [TASK-P2-2-4] alias 완전 분리 및 문서 갱신 (Phase C)
>
> - Scope: `scripts/check_vault.js` 에서 `REPO_ROOT` fallback 제거 또는 경고로 강등. `AGENTS.md` Layout 블록을 `REPO_ROOT` (harness) vs `VAULT_ROOT` (vault) 이중 구조로 재작성. `wiki/concepts/terminology.md` VAULT_ROOT 행을 독립 경로로 갱신.
> - Done: `REPO_ROOT` 와 `VAULT_ROOT` 를 혼동하는 코드 0건 (`rg "REPO_ROOT.*VAULT_ROOT|VAULT_ROOT.*REPO_ROOT"` 수동 검토).
> - Verify: `npm run verify` PASS (분리 경로 2종에서).

- **Verification (P2-2 전체):**

  ```bash
  npm run check:vault --strict                          # 기존 경로 PASS
  VAULT_ROOT=/tmp/empty-vault npm run check:vault --strict  # 분리된 빈 vault PASS (0/0)
  VAULT_ROOT=/tmp/empty-vault npm run verify            # 분리 vault 에서 verify PASS
  rg "vaultDir|VAULT_ROOT|REPO_ROOT" scripts/check_vault.js mcp/server.js
  ```

- **Rollback:**

  - Phase B: `VAULT_ROOT` env 무시 분기로 revert — 기본값 `REPO_ROOT` 로 폴백.
  - Phase C: `git revert <TASK-P2-2-4 commit>` + `AGENTS.md` Layout 복구. 분리된 vault 사용처는 `VAULT_ROOT=.` 로 즉시 복구.

---

### 3.3 P2-3: `project` 리네임 (SDK 핸들 vs 문서 용어 충돌 해소)

- **Goal:** opencode SDK 핸들 `project` (`{project, client, $, directory, worktree}`) 와 vault/문서에서 관성적으로 쓰이던 `project` (제품·리포·workspace 를 가리키던 모호어) 를 분리. SDK 핸들은 SDK 타입을 따르고, 문서·도메인 용어는 `product`/`workspace`/`instance` 중 하나로 정규화.
- **Background:** `plugins/force-delegation.js` B-1 주석 `project ≠ repo/vault/instance` 는 이미 분리 의도를 문서화. `terminology.md` 경로 별칭 표에도 `project (SDK)` 를 별도 행으로 분리. 그러나 wiki/raw 일부와 외부 클론은 여전히 `project` 를 "리포" 의미로 사용.
- **Scope (files):**

  | 파일 | 현재 | v4 목표 |
  |---|---|---|
  | `plugins/force-delegation.js` B-1 | `project ≠ repo/vault/instance` 주석 | `project (SDK handle)` 로 명확화, 혼동 예시 추가 |
  | `wiki/concepts/terminology.md` | `project (SDK)` 행 1줄 | 용어 정의 확장, 대조표에 `product`/`workspace` 추가 여부 결정 |
  | `wiki/**`, `raw/notes/*` | `project` 단어 산재 (일부는 SDK, 일부는 제품 의미) | SDK 의미 외 `project` → `workspace` 또는 `product` 로 치환 |
  | `mcp/server.js`, `scripts/*` | 변수명 `project` 사용 없음 (SDK 외부) | 영향 없음 |
  | `opencode.json` agent 정의 | `project` 미사용 | 영향 없음 |

- **Risk:** **MEDIUM** — 코드 파손보다 문서·검색 혼동이 주. 잘못 치환하면 vault 링크·Raw 인용이 깨질 수 있음.
- **Breaking Change:** Yes (docs, SDK 타입 주석). 코드 런타임 영향은 낮음.
- **Preconditions:**

  1. `rg "\bproject\b" wiki/ raw/ --glob '*.md'` 로 전수 목록 작성, 각 occurrence 를 SDK vs 도메인으로 분류.
  2. 치환 사전 확정: `project (SDK)` 유지 / `project (product)` → `product` / `project (workspace)` → `workspace`.

#### TASK — P2-3

> [TASK-P2-3-1] project 용어 인벤토리 작성 (Phase A)
>
> - 실행: `rg -n "\bproject\b" wiki/ raw/ index.md log.md 2>/dev/null | tee /tmp/project-hits.txt`
> - Done: 히트 목록을 `raw/notes/project-term-inventory.md` (또는 본 ADR Appendix) 에 분류표로 기록 — 컬럼: file:line | context | 분류(SDK/product/workspace) | 조치(유지/치환).
> - Verify: 히트 수와 분류 합계 일치.

> [TASK-P2-3-2] 문서 치환 실행 (Phase B, dual)
>
> - Scope: 분류상 `product`/`workspace` 인 occurrence 를 치환. `project (SDK)` 는 유지하되 첫 등장 시 `(opencode SDK handle)` 주석 추가.
> - Done: 치환 후 `rg "\bproject\b" wiki/ raw/` 재실행 시 남은 `project` 가 전부 SDK 의미임을 주석으로 증명.
> - Verify: `npm run check:vault --strict` PASS (링크·Raw 인용 유지) + `rg "\bproject\b" wiki/ raw/` 수동 검토.

> [TASK-P2-3-3] terminology·glossary 갱신 (Phase C)
>
> - Scope: `wiki/concepts/terminology.md` 에 `product`/`workspace` 행 추가 또는 `project` 행을 확장. `raw/notes/glossary.md` 6장 경로 별칭에 `project (SDK)` 정의를 강화.
> - Done: `rg "\bproject\b" wiki/concepts/terminology.md raw/notes/glossary.md` 가 의도된 정의만 남음.
> - Verify: `npm run verify` PASS.

- **Verification (P2-3 전체):**

  ```bash
  rg -n "\bproject\b" wiki/ raw/ index.md 2>/dev/null
  # 기대: 남은 project 는 전부 SDK handle 의미 + 주석 동반
  npm run check:vault --strict && npm run lint
  ```

- **Rollback:**

  - `git revert <TASK-P2-3-2 commit>` — 문서 치환 단일 revert. vault 링크는 `index.md` 패리티로 즉시 검증.

---

### 3.4 P2-4: scaffold 분리 (하네스 vs 지식 뼈대 분리)

- **Goal:** scaffold (`raw/` immutability, `wiki/` Raw 인용·패리티, `index.md` 카탈로그, `log.md` append-only) 를 하네스 코어(`AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/`, `tests/`) 로부터 논리·패키징 분리. foundry 가 scaffold 를 독립적으로 버전·배포·검증할 수 있게 한다.
- **Background:** `skills/verify/SKILL.md` 1절은 scaffold 를 `raw/`/`wiki/`/`index.md`/`log.md` 4종으로 정의. 현재 `package.json:files` 는 하네스+스캐폴드를 한 tarball 에 혼합. vault 분리(P2-2) 가 선행되면 scaffold 는 vault 측 자산으로 이동하는 것이 자연스럽다.
- **Scope (files):**

  | 파일 | 현재 | v4 목표 |
  |---|---|---|
  | `package.json:files` | `AGENTS.md`, `opencode.json`, `skills/`, `scripts/`, `plugins/`, `mcp/`, `tests/`, `wiki/`, `raw/`, `index.md`, `log.md` 혼합 | 하네스 코어 vs scaffold 분리 — scaffold 는 vault 패키지 또는 별도 tarball (선택지 §3.4.1) |
  | `scripts/check_vault.js`, `scripts/sync-version.js`, `scripts/tiered-verify.js` | scaffold 경로를 `REPO_ROOT` 기준으로 가정 | `VAULT_ROOT` 기준으로 전환 (P2-2 의존) |
  | `skills/verify/SKILL.md` | scaffold 4종 정의 | scaffold 분리 후 검증 범위 재정의 (harness-only vs vault-only) |
  | `AGENTS.md` Layout | 1 트리 8줄 | `REPO_ROOT` (harness) + `VAULT_ROOT` (scaffold/vault) 이중 트리 |
  | `wiki/**`, `raw/**` | 혼재 | vault 분리 시 물리 이동 가능 |

- **Risk:** **MEDIUM** — 패키징·배포 경계 변경. 잘못 분리하면 `npm pack` 누락 또는 `check:vault` 경로 불일치.
- **Breaking Change:** Yes (layout, package files, verify 범위).
- **Preconditions:**

  1. P2-2 VAULT_ROOT 분리 완료 (선행 의존).
  2. `npm pack --dry-run` 에서 하네스 코어와 scaffold 가 각각 완전함을 증명.
  3. `wiki 0 && index 0` PASS 스켈레톤이 분리된 scaffold 에서도 성립.

#### 3.4.1 분리 선택지 (Phase A 에서 결정)

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A-1: 논리 분리 (권장)** | 물리 경로는 유지, `package.json:files` 와 문서에서만 harness vs scaffold 경계를 명시. `files` 코멘트 블록으로 구분. | 물리 이동 0, 위험 최소, `cp -a` 재복제 호환 유지 | 완전한 패키징 분리는 아님 |
| **A-2: 물리 분리** | `vault/` 서브디렉터리 신설 후 `wiki/`/`raw/`/`index.md`/`log.md` 이동, `VAULT_ROOT=vault` 기본값 | 경계 명확, P2-2 와 시너지 | 모든 `Raw:` 인용·`index.md` 링크·`Vault-Base` 경로 전면 수정, HIGH RISK |
| **A-3: dual-package** | `package.json` 2개 (harness + vault) 또는 `mcp/package.json` 활용 | 배포 단위 분리 | 버전 SSOT 복잡도 증가 |

> **권장:** Phase A 에서 A-1 채택, v4.0 에서 A-1 로 릴리스 후 필요 시 v4.x 에서 A-2 검토. 본 ADR 의 TASK 는 A-1 기준으로 작성, A-2 는 별도 ADR 로 분리.

#### TASK — P2-4

> [TASK-P2-4-1] scaffold 분리 스펙 결정 및 문서화 (Phase A)
>
> - 결정: §3.4.1 중 A-1/A-2/A-3 선택, 근거 기록. `raw/notes/vault-separation-spec.md` 또는 본 ADR §3.4.1 에 결정 기록.
> - Done: 선택지 결정 + `package.json:files` 분리 주석안 초안.
> - Verify: 리뷰 승인.

> [TASK-P2-4-2] package.json files 논리 분리 (Phase B, A-1 기준)
>
> - Scope: `package.json:files` 에 주석 블록으로 harness vs scaffold 구분 (JSONC 주석 불가 시 README 또는 별도 `FILES.md` 로 문서화). `npm pack --dry-run` 출력에서 두 그룹이 모두 포함됨 확인.
> - Done: `npm pack --dry-run` 에 `AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/`, `tests/` (harness) + `wiki/`, `raw/`, `index.md`, `log.md` (scaffold) 전량 포함.
> - Verify: `npm pack --dry-run 2>&1 | grep -E "wiki/|raw/|index.md|log.md|AGENTS.md|opencode.json"` 전량 확인 + `npm run verify` PASS.

> [TASK-P2-4-3] verify 범위 재정의 (Phase B)
>
> - Scope: `skills/verify/SKILL.md` — scaffold 분리 후 `npm run verify` 가 harness 검증과 vault 검증 중 무엇을 커버하는지 명시. 필요 시 `npm run verify:vault` 별도 스크립트 제안.
> - Done: verify SKILL 문서 갱신, `tiered-verify.js` 가 `VAULT_ROOT` 분리를 인지.
> - Verify: `npm run verify` PASS + `VAULT_ROOT=. npm run verify` PASS.

> [TASK-P2-4-4] Layout 문서 갱신 (Phase C, A-1 기준)
>
> - Scope: `AGENTS.md` Layout 8줄 블록에 harness vs scaffold 경계 주석 추가. `wiki/concepts/terminology.md` scaffold 정의 갱신.
> - Done: Layout 블록이 논리 분리된 구조를 반영, 기존 경로 유지.
> - Verify: `npm run check:vault --strict` PASS + `npm run verify` PASS.

> [TASK-P2-4-5] (선택, A-2 일 때만) 물리 이동 실행
>
> - Scope: `vault/` 디렉터리 신설, `wiki/`/`raw/`/`index.md`/`log.md` 이동, 모든 `> Raw: raw/...` 인용 경로·`index.md` 링크·`Vault-Base` 상대경로 갱신, `scripts/check_vault.js` 기본값 `VAULT_ROOT=REPO_ROOT/vault` 변경.
> - Done: `npm run check:vault --strict` PASS (새 경로), `npm pack --dry-run` 누락 없음, 외부 클론 재복제 가이드 갱신.
> - Verify: `npm run verify` PASS (신·구 경로 2종) + `rg "raw/|wiki/|index.md" --glob '*.md'` 경로 일관성.

- **Verification (P2-4 전체, A-1):**

  ```bash
  npm pack --dry-run 2>&1 | sort
  # 기대: harness + scaffold 전량 포함
  npm run verify
  VAULT_ROOT=. npm run check:vault --strict
  ```

- **Rollback:**

  - A-1: `git revert <TASK-P2-4-2 commit>` — files 주석만 제거, 물리 영향 없음.
  - A-2: `git revert <TASK-P2-4-5 commit>` + 물리 경로 복구. `cp -a` 재복제가 안전망.

---

## 4. Migration Phases — 타임라인과 진입·퇴출 기준

| Phase | 버전 | 목표 | 진입 기준 (Entry) | 퇴출 기준 (Exit) | 소유자 |
|---|---|---|---|---|---|
| **Phase A — Warn** | v3.x 마지막 minor (예: v3.3.0) | deprecation 경고·가이드 배포, 외부 사용량 0건 목표 | `73992b3` 상태 유지, 본 ADR Proposed 승인 | P2-1~P2-4 각 TASK-P2-X-1 완료 + 마이그레이션 가이드 배포 + 외부 grep 리포트 작성 | harness maintainers |
| **Phase B — Dual** | v4.0-alpha / v4.0-next | 신 표준 기본 + 구 alias shim (경고 동반) | Phase A Exit 충족, `VAULT_ROOT` 스펙 확정 (P2-2-1) | P2-1~P2-4 각 TASK-P2-X-2/3 완료 + dual 경로에서 `npm run verify` PASS (신·구 2종) + `npm pack --dry-run` 완전성 | harness maintainers |
| **Phase C — Remove** | v4.0.0 (MAJOR) | shim·alias 제거, 단일 표준, BREAKING 릴리스 | Phase B Exit + `VAULT_ROOT=/tmp/empty-vault` 분리 vault PASS + 외부 grep 0건 재확인 | P2-1~P2-4 각 TASK-P2-X-4 완료 + `rg "HARNESS_ROOT"` 0건 + `npm run verify` PASS (신 경로) + `BREAKING CHANGE` 릴리스 노트 발행 | harness maintainers |

### Phase 간 불변식 (phase 를 넘어 항상 유지)

1. `npm run verify` PASS — 어느 Phase 에서도 깨지지 않음. 깨지면 해당 Phase 진입 불가.
2. `npm run check:vault --strict` PASS — vault 5/5 (또는 분리 vault 0/0) 유지.
3. `Vault-Base` 해시 도달성 — 모든 `Vault-Base: git:<hash>` 는 `git cat-file -e` 로 도달 가능.
4. `cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/` 재복제 호환 — thin 설치가 어느 Phase 에서도 동작.
5. `npm run check:version --check` 0 drift — `package.json` master 로부터 5 targets drift 없음.

---

## 5. Consequences — 결정의 결과

### Positive

- 용어·경로 debt 청산 — `REPO_ROOT` 단일 표준, `VAULT_ROOT` 논리 분리, `project` 충돌 해소로 신규 기여자 혼동 제거.
- vault 독립성 — scaffold 가 하네스와 독립 진화 가능, foundry 가 vault 만 별도 배포·검증 가능.
- 단계별 TASK 로 bisect·revert 단위 확보 — 한 커밋 일괄 제거 대비 위험 분산.

### Negative

- MAJOR 버전 — v4.0 은 모든 외부 클론·CI·스크립트에 수동 마이그레이션 비용 부과.
- 문서·링크 churn — `Raw:` 인용, `index.md` 패리티, 별칭 표 등 다수 파일 동시 수정으로 리뷰 부담.
- 듀얼 기간 shim 유지 비용 — Phase B 에서 신·구 동시 지원 브랜치 관리.

### Neutral

- raw 는 vault 검사 대상 아님 — 본 ADR 자체는 vault 카운트에 영향 없음.

---

## 6. Verification Matrix — 전체 검증 명령어

| 검증 | 명령어 | 기대 결과 | Phase |
|---|---|---|---|
| lint | `npm run lint` | exit 0 — `node --check` 6 files | A/B/C 공통 |
| vault | `npm run check:vault --strict` | `vault: 5 && index 5 — PASS` (또는 분리 vault 0/0) | A/B/C 공통 |
| test | `npm test` | 51 pass (또는 P2 신규 테스트 포함) | A/B/C 공통 |
| version SSOT | `npm run check:version` | `0 drift` | A/B/C 공통 |
| pack | `npm pack --dry-run` | harness + scaffold 전량 포함, 0 error | B/C |
| alias 제거 | `rg "HARNESS_ROOT" --hidden --glob '!node_modules' --glob '!.git' .` | 0건 (역사 제외) | C |
| project 잔존 | `rg -n "\bproject\b" wiki/ raw/` | SDK 의미만 남음 | C |
| vault 분리 | `VAULT_ROOT=/tmp/empty-vault npm run check:vault --strict` | PASS (0/0) | B/C |
| vault 분리 verify | `VAULT_ROOT=/tmp/empty-vault npm run verify` | PASS | B/C |
| 전체 verify | `npm run verify` | lint+vault+test+version+pack PASS | A/B/C 공통 |

---

## 7. Risks & Mitigations

| # | 위험 | 확률 | 영향 | 완화 (Mitigation) |
|---|---|---|---|---|
| R1 | 외부 `HARNESS_ROOT` 참조 파손 | HIGH | HIGH | Phase A 경고 1 minor 사이클, 외부 grep 0건 확인, `cp -a` 재복제 가이드, Phase B shim 유지 |
| R2 | vault 분리 시 `index.md` 패리티·`Vault-Base` 해시 파손 | MEDIUM | HIGH | 분리 vault 에서 `check:vault --strict` 0/0 PASS 먼저, P2-2 선행, bisect 단위 유지 |
| R3 | `project` 치환 중 `Raw:`·링크 파손 | MEDIUM | MEDIUM | 인벤토리 분류표 선행, 치환 후 `check:vault --strict` 즉시 검증, revert 1커밋 |
| R4 | scaffold 물리 이동 시 전 경로 churn | LOW (A-1 채택 시) | HIGH | A-1 논리 분리 우선, A-2 는 별도 ADR 로 격리, `npm pack --dry-run` 완전성 게이트 |
| R5 | Phase B 듀얼 shim 누락 (신·구 중 하나만 동작) | MEDIUM | MEDIUM | dual 경로 2종에서 `npm run verify` 동시 PASS 를 Phase B Exit 기준으로 강제 |
| R6 | 버전 SSOT drift (vault 분리 후 TARGETS 누락) | LOW | MEDIUM | `npm run check:version --check` 를 Phase 공통 불변식으로 강제, `sync-version.js` 갱신 시 리뷰 필수 |

---

## 8. Rollback Strategy — Phase 별 롤백

| Phase | 롤백 단위 | 명령 | 복구 시간 | 데이터 손실 |
|---|---|---|---|---|
| Phase A | 단일 revert — 경고 추가 커밋 | `git revert <warn-commit>` | <5분 | 없음 |
| Phase B | dual shim 중 하나 — 신 또는 구 경로 | `git revert <dual-commit>` 또는 `VAULT_ROOT=.` 로 폴백 | <10분 | 없음 (dual 이므로) |
| Phase C | P2 항목별 revert — P2-1..P2-4 독립 | `git revert <TASK-P2-X-4 commit>` (항목별) | <15분/항목 | 없음 — `cp -a` 재복제가 최종 안전망 |
| 전체 | v4.0 태그 이전으로 리셋 | `git reset --hard v3.x && git tag -d v4.0.0` + `npm run verify` | <30분 | 없음 (vault 는 git 이력에 보존, `b14f1bb` 복구 가능) |

> **최종 안전망:** vault 지식 자산은 git 이력에 보존되므로 `git show b14f1bb:<path>` 로 언제든 회수 가능 (AGENTS.md Footnote). 하네스는 disposable — foundry 에서 재복제하면 된다.

---

## 9. References

- **Commit:** `73992b3 refactor: REPO_ROOT canonical + terminology glossary (P0+P1)` — P0/P1 Add not Remove 완료, verify PASS (5/5).
- **Terminology:** `wiki/concepts/terminology.md` — 5대 용어 분리표, 경로 별칭 4종 (Add not Remove).
- **Glossary (Raw):** `raw/notes/glossary.md` — 상세판, 7절, 별칭 4종 표.
- **V3 Charter:** `raw/notes/v3-charter.md` — foundry/harness 비유, v3 6대 철학.
- **Cache Economics:** `raw/notes/cache-economics.md` → `wiki/concepts/cache-placement.md` — stable prefix / late compaction / delegation=isolation.
- **Replication:** `raw/notes/replication-checklist.md` + `wiki/references/replication-guide.md` — 0~7단계, 함정 7종.
- **Guard Depth:** `wiki/topics/guard-depth-version-ssot.md` — bash Layer 1, plugin pinning, link gate, version SSOT.
- **AGENTS.md** v3.2 — thin 헌법 (8줄 Layout, 6대 Rules, Echo #4, 금지 절).
- **opencode.json** — 3 agents (conductor/interpreter/verify), permission 5종, provider registry.
- **Vault Base:** `73992b3` (본 ADR), `eec033e`, `643af10b` 등 — 모든 `Vault-Base: git:<hash>` 도달성 유지.

---

## 10. Appendix

### A. 원본 P2 이슈 요약 (보류 사유)

| ID | 원본 의도 | 보류 사유 (v3.x) | v4 해소책 |
|---|---|---|---|
| P2-1 | HARNESS_ROOT 제거 | 외부 호환 파손 — alias 로 무파손 증명한 직후 제거하면 신뢰 회귀 | Phase A 경고 → Phase C 제거 |
| P2-2 | VAULT_ROOT 분리 | thin 가정 제거는 vault 검사·MCP 전파 필요 — 단일 커밋에 위험 집중 | Phase B dual 로 분리 vault PASS 먼저 |
| P2-3 | project 리네임 | 문서 전반 치환 — 링크·Raw 파손 위험, 분류표 선행 필요 | 인벤토리 → 치환 → 갱신 3단계 |
| P2-4 | scaffold 분리 | 패키징 경계 변경 + P2-2 선행 의존 | A-1 논리 분리 우선, A-2 별도 ADR |

### B. 향후 TASK 하달 시 사용법

본 ADR 은 **TASK 지시서 저장소**이다. 각 P2 의 `> [TASK-P2-X-Y]` 블록은 아래 형식으로 그대로 Task tool 에 복사해 하달한다.

```
gate:echo-confirmed

Echo summary (confirmed:true):
- Intent: P2-1 HARNESS_ROOT deprecation 경고 추가
- Scope/files: mcp/server.js (1 file)
- Done: 경고 출력 확인 + npm run verify PASS

Task for interpreter:
> [TASK-P2-1-1] HARNESS_ROOT deprecation 경고 추가 (Phase A)
> (본 ADR §3.1 블록 전문 복사)

Verification: rg "DeprecationWarning" mcp/server.js && npm run verify
```

**규칙:**

1. 한 번에 1개 TASK 만 하달 — bisect·revert 단위 유지.
2. Phase 순서 준수 — Phase A 완료 없이 Phase C 진입 금지.
3. 각 TASK 완료 시 `npm run verify` + 해당 Verification 명령을 증거로 첨부.
4. P2-2 는 P2-4 의 선행 — VAULT_ROOT 분리 없이 scaffold 물리 이동 금지.
5. 완료된 TASK 는 본 ADR 에 체크박스로 기록하거나 `log.md` 에 append (예: `- [x] TASK-P2-1-1 (2026-09-xx, commit <hash>)`).

### C. 체크리스트 (v4 진입 시 복사해 사용)

- [ ] Phase A — WARN
  - [ ] TASK-P2-1-1 HARNESS_ROOT 경고
  - [ ] TASK-P2-1-2 외부 grep 0건 리포트
  - [ ] TASK-P2-2-1 VAULT_ROOT 스펙 확정
  - [ ] TASK-P2-3-1 project 인벤토리
  - [ ] TASK-P2-4-1 scaffold 분리 결정 (A-1/A-2/A-3)
  - [ ] 마이그레이션 가이드 배포 (`migration-v3-to-v4.md`)

- [ ] Phase B — DUAL
  - [ ] TASK-P2-2-2 check_vault 듀얼 경로
  - [ ] TASK-P2-2-3 MCP/Inventory 전파
  - [ ] TASK-P2-3-2 문서 치환 (dual)
  - [ ] TASK-P2-4-2 files 논리 분리
  - [ ] TASK-P2-4-3 verify 범위 재정의
  - [ ] dual 경로 `npm run verify` PASS (신·구 2종)

- [ ] Phase C — REMOVE
  - [ ] TASK-P2-1-3 HARNESS_ROOT 제거
  - [ ] TASK-P2-1-4 문서·테스트 갱신
  - [ ] TASK-P2-2-4 alias 완전 분리
  - [ ] TASK-P2-3-3 terminology·glossary 갱신
  - [ ] TASK-P2-4-4 Layout 갱신
  - [ ] (선택) TASK-P2-4-5 물리 이동 (A-2 일 때만)
  - [ ] `rg "HARNESS_ROOT"` 0건 + `npm run verify` PASS + BREAKING 릴리스 노트

---

*본 문서는 raw 자산으로 vault 검사 대상이 아니며, 향후 메이저 릴리스 시 단계별 TASK 로 쪼개 하달하는 지시서로 사용된다. 수정 시 git 이력으로 추적하고, vault 에서 참조할 경우 `wiki/concepts/v4-migration-adr.md` 요약 페이지를 별도 생성한다 (현재는 raw 만, vault 5/5 유지).*
