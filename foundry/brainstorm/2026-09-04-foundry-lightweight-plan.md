# Foundry 경량화 계획 — 외부자문 반영 확정 (2026-09-04)

> gate:echo-confirmed — echo:{summary:"외부자문 반영 계획문서 확정(P1·P4·P2'·P3'메시지 채택, P2·P3 기각) 후 P1 history OFF 진입", confirmed:true}
> Locked: intent=파운드리 요구 경량화 계획 확정 + P1 실행준비 / done=계획문서 확정 + P1 위임준비 + verify PASS
> Fail-closed 준수 — Echo confirmed이므로 dispatch 가능.

## 0. Inventory (WSL 절대경로 우선, UNC 읽기전용 fallback)

- 시도: WSL 절대경로 `/home/jayeo/projects/006-palank-harness` 우선 시도.
- 결과: 현 세션 bash 툴 permission이 `wsl*` 미허용 + `*|*`/`*;*` deny라 `wsl --exec` + 파이프 체인 불가.
- Fallback: UNC `\\wsl.localhost\Ubuntu\home\jayeo\projects\006-palank-harness` 읽기전용으로 `node scripts/inventory.js` (cache-first, `--refresh` 없음) 실행.
- 출력: `FAIL: WSL UNC path forbidden — use ~/projects/<repo> Linux absolute ... (ROOT=UNC)` 경고 후 캐시 히트 반환 (non-strict이므로 exit 0, 쓰기 없음).
- 캐시: `.opencode-inventory.json` generated_at `2026-09-03T15:17:09.319Z`, available:true, version `1.18.27`, agents `build,plan` (opencode debug config), tools `customize-opencode, wiki-manager, hasoonote-*, find-skills, harness-bootstrap, app-store-screenshots, palank-domain, nlm, /harness, skill:interpreter, skill:reviewer, skill:verify`.
- 주의: cache 24h 경과 임박 — 다음 P1 실행 터미널(WSL native)에서는 `npm run inventory` 1회로 캐시 유효성 재확인, 필요 시 1곳에서만 `npm run inventory:refresh`.

## 1. 배경

- v3.3.1 tiered 자기오염 1~4 완료 (HISTORY_EXCLUDE + dry-run/fixture 가드 + tier 분기 래퍼 + inventory 캐시 우선).
- 잔여 증상: 측정 행위(감사 기록)가 측정 대상(변경 집계)을 오염시키는 Heisenberg 구조의 잔재 — `tiered --check` 1회 = history 1줄 append라 연속 실행 시 diff가 커지고 FULL 고착 재발 위험.
- 외부자문 실측 근거: **2.6s** (QUICK/경량 경로가 FULL 5-chain 대비 단축 — 자문 측정 인용, P1 후 WSL native에서 재측정 예정).
- 목표: 파운드리 요구 경량화 — 감사 완전성(CQS·sidecar)은 유지하되 쓰기 빈도를 0으로.

## 2. 채택표 (외부자문 P1~P4)

| ID | 원안 요약 | 판정 | 채택 이유 / 기각 이유 |
|----|-----------|------|----------------------|
| P1 | history append OFF — `--check`는 조회만, 기록은 `--log` 명시 시에만 (CQS), sidecar `.verify-tier.json` 유지 | **채택 (즉시 실행)** | Heisenberg 차단의 정점. 집계 제외(1단계)+dry-run 가드(2단계)만으로는 실측 `--check` 1줄 오염이 남음. CQS로 Query/Command 분리해야 tiered 2회 동일 결과 보장. sidecar는 SKIPPED 증거라 유지해야 fail-closed가 깨지지 않음. |
| P4 | UNC Fast-Fail | **한정채택** | WSL 절대경로 원칙은 유지하되 Fail 범위를 한정. strict에서만 exit 1, non-strict는 warning + 캐시 반환으로 한정. UNC 쓰기금지는 유지. 멀티터미널 UNC FS 공유가 타임아웃 증폭 원인이므로 메시지 정밀화만 하고 차단은 완화하지 않음. |
| P2 | (원안) pack 관련 완화 — verify에서 pack 제외 등 | **기각** | pack은 tarball hygiene SSOT (`npm pack --dry-run`에서 foundry 제외 확인이 thin 배포의 유일 기계 게이트). 제거 시 상품화 정체성 검증 공백. churn 없이 유지가 원칙. |
| P2' | pack 분리 — QUICK에서는 pack 생략, FULL에서만 pack (경량화는 분리로 달성) | **채택 (순서 마지막)** | 기각된 P2의 의도(시간 단축)는 살리되 수단은 분리로 교체. `verify:quick`=lint+vault+test, `verify`=전체+pack. foundry 제외 목록은 손대지 않음. |
| P3 | (원안) force-delegation 정규식 완화 — redirect/alias 차단 완화 | **기각** | fail-closed 약화. `sc`/`ac`/`ni`/`mi`·`>f`·`<<` 차단은 v3.2 P1-2 실측 기반. 완화 시 conductor 우회 경로 부활. |
| P3' | self-healing 메시지 + 정규식 정밀화만 | **부분채택 (메시지채택, 정규식 정밀화만)** | 차단은 유지, DX만 개선. 차단 에러에 `Task->interpreter` 올바른 호출 예시 1줄 추가 (self-healing 메시지). 정규식은 false-positive 정밀화만 (`sc.exe` 충돌 주석 유지, `2>&1`/`$null`/`NUL` 면제 유지, arrow-fn `=>` 오탐 방지 유지). |

## 3. Decisions (Lock)

- **history만 OFF (sidecar 유지)**: `foundry/verify-history.jsonl` append를 `--log` 명시 시에만 수행. `.verify-tier.json` sidecar 쓰기는 SKIPPED 증거라 유지 (없으면 exit 2).
- **pre-push 스크립트만 추가 (husky 다음)**: `scripts/pre-push(NEW)` 파일만 이번 라운드에 추가. husky 설치·`.git/hooks` 연결은 다음 라운드로 유보 (thin 오염 방지, 수동 `cp` fallback 유지).
- 순서: **P1 → P4 → P3' → P2'** (Heisenberg 차단 → UNC 안정화 → DX 메시지 → pack 분리).

## 4. 상세 설계

### P1 — history OFF / CQS (이번 위임)

- 현행 `scripts/tiered-verify.js` main(): SKIPPED 분기 + QUICK/FULL 분기 모두 `if (!opts.dryRun && !opts.fixture)`이면 append. 실측 `--check`는 매번 1줄 증가.
- 변경: append 조건에 `&& opts.log` 추가. `--log` 없으면 0증가. CLI에 `--log` 플래그 신설 (`--check --log`일 때만 history 1줄).
- `scripts/verify-tiered.js` 래퍼: 현재 tiered 1회 측정 시 history 1줄 발생 → `--check`만 호출 (log 없음)으로 변경해 위임 경로 오염 0. 명시적 감사 필요 시에만 `--log` 전달.
- sidecar: `EVIDENCE_PATH` 쓰기 로직 무변경 (SKIPPED면 stdout JSON 1줄 + sidecar 필수, QUICK/FULL은 sidecar 미기록 기존 유지).
- `HISTORY_EXCLUDE`·`isHistoryFile()`·`excludedHistory`·`SKIPPED(audit-only)` 로직 무변경 (BLACKLIST 무손상).
- 테스트 2건 동반수정 예고: `tests/tiered-verify.test.js` CLI `--fixture` 계열 중 history append를 가정하는 단언이 있으면 `--log` 명시로 갱신 (fixture는 기존대로 오염 0 유지). `tests/force-delegation.test.js`는 무관 (P3'까지 손대지 않음).
- done 상세: `tiered --check` 2회 동일 출력 + history 0증가 + `npm run verify` PASS.

### P4 — UNC Fast-Fail 한정 (다음)

- 대상: `scripts/inventory.js` + `scripts/check_vault.js` UNC 가드.
- 한정: `--strict`에서만 exit 1, 그 외는 `console.error(WARNING...)` + 정상 진행 (현재 non-strict도 `FAIL:` 문구라 `WARNING:`로 문구 정밀화).
- Linux 절대경로 안내 문구 유지 (`/home/jayeo/projects/...`), UNC 쓰기금지 원칙 유지.
- 검증: UNC에서 `node scripts/inventory.js` → warning + 캐시 히트 exit 0, `--strict` → exit 1.

### P3' — self-healing 메시지 + 정규식 정밀화 (다음다음)

- 대상: `plugins/force-delegation.js`.
- 메시지: Echo 게이트 차단 + conductor 직접쓰기 차단 에러에 `Delegate via Task(subagent_type="interpreter", prompt="gate:echo-confirmed ...")` 1줄 예시 추가. 기존 fail-closed 조건식 무변경.
- 정규식: `UNIX_PATTERNS`·`POWERSHELL_PATTERNS`·`DESTRUCTIVE_PATTERNS` 임계값은 유지, `sc.exe` 충돌 주석·`2>&1`/`$null`/`NUL` 면제·`=>` 오탐 가드 회귀테스트 유지. 정밀화는 테스트 추가 방식으로만 (기존 6건 + 신규 1건).
- P3 원안(완화)은 기각이라 `isBlocked`·`isDestructive`·`taskGateOk` 시그니처 변경 없음.

### P2' — pack 분리 (마지막)

- 대상: `package.json` scripts + `scripts/pre-push(NEW)`.
- 분리: `verify:quick`=lint+vault+test (pack 없음), `verify`=전체+pack (현행 유지). `verify-tiered.js` 분기는 SKIPPED→0, QUICK→verify:quick, FULL→verify 그대로 (P1에서 log만 제거).
- `scripts/pre-push(NEW)`: `verify` FULL 1회 + `pack --dry-run` foundry 제외 확인. husky 연결은 다음 라운드.
- 검증: `npm pack --dry-run`에서 foundry 제외·opencode.json·tests 포함 유지.

## 5. Scope / Files (Lock)

```json
["foundry/","scripts/tiered-verify.js","scripts/verify-tiered.js","scripts/pre-commit","scripts/pre-push(NEW)","scripts/inventory.js","scripts/check_vault.js","plugins/force-delegation.js","package.json","tests/tiered-verify.test.js","tests/force-delegation.test.js"]
```

- 이번 P1 위임 범위: `scripts/tiered-verify.js`, `scripts/verify-tiered.js`, `tests/tiered-verify.test.js` (2건 동반수정), `foundry/brainstorm/` 본 계획문서 (이미 생성).
- P4·P3'·P2' 파일은 이번에 읽기만 (수정 금지, 계획 선점 방지).

## 6. Done (Lock)

- [x] 계획문서 확정 (본 파일, overwrite 없이 신규)
- [ ] P1 위임준비 (다음 Task spec ready — 아래 §7)
- [ ] `npm run verify` PASS (P1 완료 후: lint + check:vault --strict + test + check:version + pack --dry-run)

## 7. P1 다음 Optimal Call Spec (gate:echo-confirmed ready)

```json
{
  "intent": "P1 history OFF — tiered append --log화 (CQS), sidecar 유지",
  "files": ["scripts/tiered-verify.js", "scripts/verify-tiered.js", "tests/tiered-verify.test.js"],
  "schema": {},
  "opencode_call": "Task(subagent_type=interpreter)",
  "model": "opencode.json#model (xhigh, SSOT)",
  "mcp": "palank-domain",
  "echo": {"summary": "P1 history OFF 진입 — --check는 조회만, --log시에만 history 1줄, sidecar 유지, 테스트2건 동반수정", "confirmed": true},
  "mode": "guardian",
  "gate": "gate:echo-confirmed",
  "done": "tiered --check 2회 동일 출력 + history 0증가 + npm run verify PASS"
}
```

- Task 프롬프트 선두에 `gate:echo-confirmed` 필수 (미선언 시 force-delegation이 fail-closed 차단).
- 실행 환경: WSL native 터미널 우선 (`cd ~/projects/006-palank-harness`), UNC면 읽기전용 + 본 §0 fallback 명기.
- 금지: `--refresh` 난사 금지 (inventory 캐시 우선), 무거운 5-chain 직접 실행 금지 (verify는 P1 완료 후 1회만), foundry overwrite 금지 (신규 파일만).
- 검증 순서: `node --check` 2파일 → `node scripts/tiered-verify.js --check` 2회 동일 + history 줄수 동일 (`wc -l foundry/verify-history.jsonl` 전후 비교, +0) → `node scripts/tiered-verify.js --check --log` 1회 +1 확인 (CQS 동작 증명) → `npm test -- tests/tiered-verify.test.js` → `npm run verify`.

## 8. 리스크 + 롤백

- 리스크: `--log` 누락 시 감사 공백 (history 무증가). 완화: `verify-tiered.js` 명시 경로 + pre-push에서 `--log` 1회로 감사 복원.
- 롤백: `git diff HEAD -- scripts/tiered-verify.js scripts/verify-tiered.js` 확인 후 `git checkout -- <file>` 또는 `git stash push -m "pre-p1-history-off"`.

> Raw: not required — foundry/ is outside vault (check_vault 대상 아님), hermetic per-project
> Vault-Base: git:HEAD (v3.3.1 + tiered 1~4)
