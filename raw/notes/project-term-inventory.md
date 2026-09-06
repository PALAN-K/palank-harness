# project 용어 인벤토리 (TASK-P2-3-1, Phase A)

- 날짜: 2026-09-06
- 방법: `rg -n "\bproject\b" wiki/ raw/ index.md log.md` + 코드측 `rg -n "\bproject\b" mcp/server.js scripts/ plugins/`
- 상태: read-only 조사 + raw 기록 1건 (wiki 직접 수정 없음)
- 원문: `raw/notes/v4-migration-adr.md` §3.3 P2-3 TASK-P2-3-1 지시서

## 수집 결과 (원문 재확인 완료)

- TASK 범위 (wiki/raw/index/log): **32 lines** — wiki 1 + raw 29 (ADR 25 + glossary 1 + allowlist 3) + log 2 + index 0
- 코드측: **9 lines** — mcp 3 + plugins 3 + scripts 3 (inventory 2 + pre-commit 1)
- **합계 41 lines**

`rg -c` 실측 (2026-09-06):

- `log.md:2`, `wiki/concepts/terminology.md:1`, `raw/data/allowlist-candidates.json:3`, `raw/notes/glossary.md:1`, `raw/notes/v4-migration-adr.md:25`, `index.md:0 (no match, exit 1)`
- 코드측: `mcp/server.js:10,12,107`, `plugins/force-delegation.js:11,130,131`, `scripts/inventory.js:87,121`, `scripts/pre-commit:3`
- `scripts/tiered-verify.js`, `check_vault.js`, `validate-schema.js`, `sync-version.js`, `sync-architecture.js`, `verify-tiered.js`: 0건
- `opencode.json`: 0건 (ADR §3.3 Scope "미사용"과 일치)

## 분류 기준

- `SDK` — opencode SDK 핸들 `{project,client,$,directory,worktree}` 또는 `project (SDK)` / `project ≠ repo/vault/instance` 정의행. 조치: 유지.
- `config-scope` — opencode 권한·스킬 계층의 project-local 스코프 (Global vs Project overlay, built-in/project/global). upstream opencode 용어와 정합 필요. 조치: 판단필요 (P2-3-2에서 스코프 명시 여부 결정, 무단 리네임 금지).
- `workspace` — 리포 루트·인스턴스 의미의 `project root` / `per-project`. 조치: 치환 (P2-3-2에서 `REPO_ROOT` / `per-workspace`로).
- `메타` — P2-3 TASK 지시서·검증식·체크리스트 자체가 `project` 단어를 언급한 행 (치환 대상 아님, 이력 보존). 조치: 유지.

## 힌트 대비 정정 (원문 재확인 결과, 필수 기록)

1. `ADR L220`은 히트 아님 — 해당 행은 `` `rg "\bproject\b" ...` `` 명령 자체이며, `project`가 리터럴 `\bproject\b` 안에 있어 `\b` 경계상 매칭되지 않음 (실측 히트 라인에 220 없음). 힌트의 "혼합·메타 L220"은 오기이며, 실제 히트는 `L221` (치환 사전 확정행). 본표는 L221을 메타로計上.
2. "도메인 치환후보 (11)"은 실제 10건 — `config-scope 5 (allowlist 3 + inventory 2)` + `workspace 5 (mcp 3 + pre-commit 1 + log 1)` = 10. L220 오기가 +1 부풀림의 원인. 총합은 `SDK 16 + config-scope 5 + workspace 5 + 메타 15 = 41`로 히트 수와 일치.
3. `allowlist-candidates.json`은 소문자 `project`만計上 (대문자 `Project`는 본 인벤토리 범위 외, 별도 Note 참조 — L26 `Project template` 1건은 대문자이므로 rg `\bproject\b` case-sensitive상 미포함이 아니라 포함? 실측: rg 기본 case-sensitive이므로 `Project`는 미매칭. 본표 23,25,26 행의 소문자 `project`/`global/project`/`project-local`만 해당).

## 분류표 (41 rows)

| # | file:line | context (요약) | 분류 | 조치 |
|---|---|---|---|---|
| 1 | wiki/concepts/terminology.md:29 | `` `project` (SDK) \| SDK 핸들 \| B-1 `project ≠ repo/vault/instance` \| 혼동 금지 ``` | SDK | 유지 (정의행) |
| 2 | raw/notes/glossary.md:47 | `` `project` (SDK) \| `{project,client,$,directory,worktree}` — 위 4종과 무관 \| B-1 ``` | SDK | 유지 (정의행) |
| 3 | raw/notes/v4-migration-adr.md:20 | P0 REPO_ROOT 표준화 — `HARNESS_ROOT/ROOT/VAULT_ROOT/SDK project`는 alias·주석 유지 | SDK | 유지 |
| 4 | raw/notes/v4-migration-adr.md:21 | P1 Terminology 정리 — 5대 용어 분리, `project ≠ REPO_ROOT/VAULT_ROOT` 분리 주석 | SDK | 유지 |
| 5 | raw/notes/v4-migration-adr.md:32 | P2-3 표 행 — SDK `project` 핸들 + 문서 `project` 오남용 → `product`/`workspace` 리네임 | 메타 | 유지 (TASK 정의행) |
| 6 | raw/notes/v4-migration-adr.md:59 | 기각 대안 "지금 바로 제거" — 외부 `HARNESS_ROOT`/`project` 참조 파손 | 메타 | 유지 (사유서) |
| 7 | raw/notes/v4-migration-adr.md:202 | §3.3 헤더 `project` 리네임 (SDK 핸들 vs 문서 용어 충돌 해소) | 메타 | 유지 |
| 8 | raw/notes/v4-migration-adr.md:204 | Goal — SDK `project ({project,...})` vs vault/문서 모호어 (제품·리포·workspace) 분리 | 메타 | 유지 (문제정의, SDK+도메인 혼재 언급) |
| 9 | raw/notes/v4-migration-adr.md:205 | Background — B-1 `project ≠ repo/vault/instance` 문서화済, 일부는 `project`를 "리포" 의미로 사용 | 메타 | 유지 |
| 10 | raw/notes/v4-migration-adr.md:210 | Scope표 B-1 — `project ≠ repo/vault/instance` → `project (SDK handle)` 명확화 | SDK | 유지 |
| 11 | raw/notes/v4-migration-adr.md:211 | Scope표 terminology — `project (SDK)` 행 1줄, 정의 확장 여부 결정 | SDK | 유지 |
| 12 | raw/notes/v4-migration-adr.md:212 | Scope표 산재 — `project` 단어 산재 (일부 SDK, 일부 제품 의미), SDK 외 치환 | 메타 | 유지 (범위 선언행) |
| 13 | raw/notes/v4-migration-adr.md:213 | Scope표 코드 — `mcp/server.js, scripts/*` 변수명 `project` 사용 없음 | SDK | 유지 (부재 선언, SDK 변수 기준) |
| 14 | raw/notes/v4-migration-adr.md:214 | Scope표 agent — `opencode.json` agent 정의 `project` 미사용 | SDK | 유지 (부재 선언) |
| 15 | raw/notes/v4-migration-adr.md:221 | Precondition 치환 사전 — `project (SDK)` 유지 / `project (product)`→product / `project (workspace)`→workspace | 메타 | 유지 (사전 정의행) |
| 16 | raw/notes/v4-migration-adr.md:225 | TASK-P2-3-1 헤더 — project 용어 인벤토리 작성 (Phase A) | 메타 | 유지 |
| 17 | raw/notes/v4-migration-adr.md:227 | TASK 실행 — `rg -n "\bproject\b" wiki/ raw/ index.md log.md` 전수 | 메타 | 유지 |
| 18 | raw/notes/v4-migration-adr.md:228 | TASK Done — `raw/notes/project-term-inventory.md` 분류표 기록 (본 파일) | 메타 | 유지 |
| 19 | raw/notes/v4-migration-adr.md:233 | P2-3-2 Scope — `product`/`workspace` 치환, `project (SDK)` 유지 + 주석 추가 | 메타 | 유지 |
| 20 | raw/notes/v4-migration-adr.md:234 | P2-3-2 Done — 치환 후 남은 `project` 전부 SDK 의미임을 주석 증명 | SDK | 유지 (잔존 SDK 선언) |
| 21 | raw/notes/v4-migration-adr.md:239 | P2-3-3 Scope — terminology `product`/`workspace` 행 추가, glossary `project (SDK)` 강화 | SDK | 유지 (정의 강화 지시) |
| 22 | raw/notes/v4-migration-adr.md:247 | Verification 기대 — 남은 project 전부 SDK handle + 주석 동반 | SDK | 유지 |
| 23 | raw/notes/v4-migration-adr.md:359 | Consequences Positive — `project` 충돌 해소로 혼동 제거 | 메타 | 유지 |
| 24 | raw/notes/v4-migration-adr.md:385 | Verification Matrix — project 잔존, SDK 의미만 남음 | SDK | 유지 |
| 25 | raw/notes/v4-migration-adr.md:398 | Risk R3 — `project` 치환 중 `Raw:`·링크 파손, 인벤토리 선행 완화 | 메타 | 유지 |
| 26 | raw/notes/v4-migration-adr.md:441 | Appendix 롤백 표 — P2-3 project 리네임, 인벤토리→치환→갱신 3단계 | 메타 | 유지 |
| 27 | raw/notes/v4-migration-adr.md:477 | 체크리스트 — `[ ] TASK-P2-3-1 project 인벤토리` | 메타 | 유지 |
| 28 | raw/data/allowlist-candidates.json:23 | `project permission.bash example: {"*":"ask",...}` (opencode 권한 예시) | config-scope | 판단필요 (upstream 예시, P2-3-2 결정) |
| 29 | raw/data/allowlist-candidates.json:25 | `global/project '*':'ask' is baseline` (Global vs Project 베이스라인) | config-scope | 판단필요 |
| 30 | raw/data/allowlist-candidates.json:26 | `Global + Project template dual overlay … project-local proposal` (이중 오버레이) | config-scope | 판단필요 |
| 31 | log.md:18 | `({project,client,$,directory,worktree}) => Promise<Hooks>` 전면 재작성, SDK 타입 실측 | SDK | 유지 |
| 32 | log.md:62 | `hermetic per-project (foundry는 repo 로컬 …)` | workspace | 치환 (`per-project`→`per-workspace`, P2-3-2) |
| 33 | mcp/server.js:10 | `verify_before_tag — spawns npm run verify at project root` | workspace | 치환 (`project root`→`REPO_ROOT`, P2-3-2) |
| 34 | mcp/server.js:12 | `Copy per project and add domain tools` | workspace | 치환 (`per project`→`per workspace` 또는 문장 정비, P2-3-2) |
| 35 | mcp/server.js:107 | `Run npm run verify preflight at project root` (tool description) | workspace | 치환 (`project root`→`REPO_ROOT`, P2-3-2) |
| 36 | plugins/force-delegation.js:11 | `entry is now ({ project, client, $, directory, worktree }) => Promise<Hooks>` | SDK | 유지 |
| 37 | plugins/force-delegation.js:130 | `B-1: SDK Project (≠ repo/vault/instance) — project is SDK handle` | SDK | 유지 |
| 38 | plugins/force-delegation.js:131 | `export default async function forceDelegation({ project, client, ... })` | SDK | 유지 |
| 39 | scripts/inventory.js:87 | `1) opencode debug skill — built-in/project/global skills` | config-scope | 판단필요 (upstream 스킬 계층명, 스코프 명시 여부 P2-3-2) |
| 40 | scripts/inventory.js:121 | `3) filesystem globs — project + global command/agent/skill dirs` | config-scope | 판단필요 |
| 41 | scripts/pre-commit:3 | `Foundry is hermetic per-project.` | workspace | 치환 (`per-project`→`per-workspace`, P2-3-2) |

## 합계 대조

- 히트: TASK 32 + 코드 9 = **41 lines**
- 분류: SDK 16 (#1,2,3,4,10,11,13,14,20,21,22,24,31,36,37,38) + config-scope 5 (#28,29,30,39,40) + workspace 5 (#32,33,34,35,41) + 메타 15 (#5,6,7,8,9,12,15,16,17,18,19,23,25,26,27) = **41 — 일치**
- 조치: 유지 31 (SDK 16 + 메타 15) + 치환 5 (workspace 5) + 판단필요 5 (config-scope 5) = **41 — 일치**

## 주의·제약 확인

- wiki는 1건만 (terminology.md:29, SDK, 유지) — P2-3-1에서 wiki 수정 없음.
- index.md 0건 — 카탈로그 오염 없음.
- glossary/terminology 정의행 (#1,2)은 유지 — P2-3-3에서 확장만, 삭제 금지.
- allowlist 대문자 `Project` (L26 `Project template`)는 `rg "\bproject\b"` case-sensitive상 별도 토큰이 아니라 동일 행 내 소문자와 함께計上됨 — 본표 #30은 소문자 `project-local`/`global/project` 기준이며 대문자 단독 행은 없음.
- ADR L220 (`rg "\bproject\b"` 명령행)은 이스케이프 패턴으로 히트 0 — 인벤토리에서 제외하고 L221로 대체함을 명시 (재현: `rg -n "\bproject\b" raw/notes/v4-migration-adr.md`에 220 없음).

## 다음 TASK (이번에 수행 금지)

- P2-3-2 문서 치환: 본표 조치 `치환` 5건 (mcp 3 + pre-commit 1 + log 1)만 대상. `config-scope` 5건은 판단필요 유지 후 upstream 정합 검토. `SDK`/`메타` 31건은 유지.
- P2-3-3 terminology·glossary 갱신은 P2-3-2 완료 후.

## 보완 (Phase A review, 2026-09-06 — append-only, 기존 41 rows 무수정)

1. 단위 명확화: 본 파일의 "41 lines" 표현은 "41 inventory rows"를 의미함 (file 97 lines incl. meta — 분류표 L38-78 41행 + 헤더·대조·주의 문단 포함 시 97 lines). 향후 인용 시 "41 inventory rows (file 97 lines incl. meta)"로 표기.
2. 스냅샷 한정: 본 인벤토리 수집치는 HEAD 스냅샷 기준 — wiki 1건 (`wiki/concepts/terminology.md:29`, SDK 정의행) / glossary 1건 (`raw/notes/glossary.md:47`, SDK 정의행). worktree 현재(P2-3-2 진행 중)는 wiki 3건(L29,30,31 — L30,31은 `product`/`workspace`행 내 `project (SDK)` 대조언급) / glossary 2건(L47 정의행 + L51 치환사전행)으로 증가 — 이는 P2-3-2 의도적 추가이므로 본표 41 rows와 혼동 금지 (재현: `git show HEAD:wiki/concepts/terminology.md | rg -n "\bproject\b"` = 1건, worktree `rg -n "\bproject\b" wiki/concepts/terminology.md` = 3건).
3. 아티팩트 크기 정정: 리뷰 중 언급된 "5470B"는 오기 — `architecture.html` 실측 5986B (`ls -l`/`wc -c` 2026-09-06 확인). 향후 인용 시 아티팩트명 병기 ("architecture.html 5986B").
4. 의도 잔류 (P2-3-2 Done 기준, rg 감사 회귀 금지): terminology 4× `project (SDK)` 대조언급 (L30 2건 + L31 2건, `product`/`workspace` ≠ SDK 선언) + glossary L51 치환사전행 (`project (SDK)` 유지 / config scope 5건 유지 선언) + config-scope 5건 (`allowlist 3 + inventory 2`, `(opencode config scope)` 주석 동반)은 P2-3-2 Done 기준 의도 잔류임. 향후 `rg "\bproject\b"` 감사 시 이를 "미치환 잔존"으로 회귀 판정 금지 — 판정 기준은 본 인벤토리 §분류 기준 + glossary 6장 정의.
