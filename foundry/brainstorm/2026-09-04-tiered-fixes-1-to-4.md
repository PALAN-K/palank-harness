# Tiered 자기오염 수정 1~4단계 — 2026-09-04 (ONE batch, 빌드모드 직행)

> 증상: 하네스 경유 시 1분짜리 일이 10분 먹통, 위임 게이트 throw→재시도 무한 루프 체감
> 원인: 측정 행위(감사 기록)가 측정 대상(변경 집계)을 더럽히는 Heisenberg 구조 + 매번 실시간 탐침 + QUICK/FULL 구분 없는 전체 검증
> 방식: 빌드모드 직행 (하네스 위임 없이 직접 수정, 무거운 5-chain 금지, --dry-run + 타깃 테스트만)

## 1단계. 감사장부를 채점에서 제외 (집계 제외, append 유지)

- 문제: `foundry/verify-history.jsonl`이 매 실행 1줄씩 늘어 33줄이 되자, 그 파일 하나만으로 `total 33 > 30 → FULL`이 확정. 이후 모든 변경이 FULL에서 탈출 불가.
- 수정: `scripts/tiered-verify.js`에 `HISTORY_EXCLUDE = ["foundry/verify-history.jsonl", ".verify-tier.json"]` + `isHistoryFile()` 추가. `getGitState()`가 집계(`tracked/untracked/allFiles/totalLines`)에서 제외하고 `excludedHistory`로 별도 보고. `BLACKLIST`는 손대지 않음 (BLACKLIST 적중은 FULL 강제라 역효과).
- 예외: history만 남으면 `evaluateTier()`가 `SKIPPED (audit-only …)` 반환 — history 단독 diff가 영원히 FULL이던 고착 해소.
- 비유: 성적표(감사 기록)가 시험 문제(변경 집계)에 섞여 채점되던 걸 분리.

## 2단계. 연습시험은 성적표에 기록 금지 (dry-run/fixture append 가드)

- 문제: `--dry-run`·`--fixture` 때도 무조건 append라 `npm test` 한 번에 픽스처 5줄씩 오염, 동일 블록 10회 중복.
- 수정: SKIPPED 분기·QUICK/FULL 분기의 `appendFileSync`를 둘 다 `if (!opts.dryRun && !opts.fixture)`로 감쌈. 실제 `--check`만 1줄 기록. sidecar(`:489` 대칭) 로직과 정합.
- 비유: 모의고사 점수가 생활기록부에 찍히던 걸 중단, 본고사만 기록.

## 3단계. 가벼운 검사는 가볍게 (tier별 분기 래퍼)

- 문제: `verify:tiered = tiered --check || npm run verify` — QUICK과 FULL이 둘 다 exit 1이라 측정 후 항상 전체 5-chain을 또 실행 (시간 2배).
- 수정: 신규 `scripts/verify-tiered.js` 래퍼. tiered 1회 측정 후 SKIPPED→종료(0), QUICK→`verify:quick` (lint+vault+test), FULL→`verify` (전체), 변조(exit 2)→차단. 판정은 exit코드가 아니라 stdout JSON의 `tier` 필드로 분기라 기존 exit 계약·51개 테스트 무손상. `package.json verify:tiered` + `scripts/pre-commit`을 래퍼 호출로 교체, `lint`에 신파일 추가.
- 비유: 감기에도 종합검진을 돌리던 걸 증상별 처방으로 변경.

## 4단계. 매번 실시간 조회 → 24h 캐시 우선 (멀티터미널 스톰 해소)

- 문제: `npm run inventory = --refresh`라 매 Task마다 15s×2+10s 탐침 + 7개 루트 전수스캔. 터미널 3개가 겹치면 3배 스톰 → 타임아웃 → 오위임 → 재시도.
- 수정: `npm run inventory`는 캐시 우선(`.opencode-inventory.json`, 24h 유효, 만료/부재 시에만 live 수집), 실시간이 필요할 때만 `npm run inventory:refresh`. `inventory.js` 주석 정합.
- 사용자 통제: 고를 수 있음 — 평소엔 `npm run inventory` (빠름), pull·모델변경 직후 1개 터미널에서만 `npm run inventory:refresh` 1회 (나머지는 캐시 히트). 캐시 삭제(`.opencode-inventory.json` 삭제)도 강제 갱신과 동일.
- 비유: 매번 본사에 전화 확인 → 게시판(24h) 보고 전화는 바뀔 때만.

## 검증 증거 (무거운 체인 없이)

- `node --check` + `wsl npm run lint`: PASS (7파일)
- `--dry-run`: `files:["scripts/tiered-verify.js"]`만, history 제외, 사유는 blacklist 정상화 (1번 증명)
- dry-run 전후 history 70줄 유지 (2번 dry-run 증명)
- `wsl npm test -- tests/tiered-verify.test.js`: 51/51 PASS ×2회, suite 후에도 70줄 유지 (2번 fixture 증명, 기존엔 10줄 오염)

## 멀티터미널 노트 (가설 검증)

- 가설 "3터미널이 1터미널보다 심하다"는 타당. 로직은 프로젝트 단위 격리지만 실행 자원(opencode CLI/모델 쿼터, CPU, UNC FS `\\wsl.localhost`, 전역 스킬)은 공유라 겹칠수록 타임아웃·재시도가 증폭됨.
- 처방: WSL 터미널 사용(PS+UNC 금지), refresh는 1곳에서만, 나머지는 캐시.

> Raw: not required — foundry/ is outside vault (check_vault 대상 아님), hermetic per-project
> Vault-Base: git:HEAD (v3.3.0 + working tree 1~4단계)
