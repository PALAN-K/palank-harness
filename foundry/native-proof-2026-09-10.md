# Native Proof — Step 5 (2026-09-10)

- date: 2026-09-10 (KST)

## Step 5 증거 (fresh terminal, native 직행)
- 환경: fresh terminal, Build 모드, MiMo V2.5 Free
- 소요: 17.6s
- 호출 계측: direct Read x1, Task 0, MCP 0, Echo 0
- 의미: Echo/Interview/Lock/Task 위임 없이 native 직행 실행 확인

## 커밋 2건 (scope 한정)
- 3b26b6b — docs(agents): scope wiring to conductor path, native exempt [verify PASS] + Vault-Base + Tier FULL
  - 변경: AGENTS.md 에 Scope 4줄 추가만 (palank wiring applies to conductor path only — native build/plan exempt)
- 50f41b6 — chore(config): scope build/plan native exempt [verify PASS]
  - 변경: opencode.json 에 build/plan override 20줄 추가만 (native 직행 프롬프트 + palank-domain deny)

## 검증 6/6 단일-스테이지 PASS
- 주체: Muse Spark Free 에서 직접 실행
- 결과: 6/6 PASS (lint, vault 0, test 75/75, version drift 0, arch fresh, pack 72)
- Vault-Base: git:3b26b6b, Tier: FULL 기록

## 결론
- guard/exempt 이중-경로 공존 입증: conductor 경로의 Echo-first 강제 위임(guard)은 그대로 유지되면서, native build/plan 경로는 exempt 로 직행한다.
- AGENTS.md 전체 헌법 유지 + Scope 문장만 추가, opencode.json conductor 블록 무변경이 공존의 증거다.

## 알려진 한계
- ambient AGENTS autoload + plugin global gate 는 손대지 않음 (untouched)
- Step 4 는 유지됨 (kept) — 본 Step 5 는 범위 한정 추가이며 기존 스텝을 대체하지 않음
