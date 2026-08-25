# Log — append-only audit ledger

## [2026-08-25] rebuild | v2 → v3 clean rebuild (Echo-first interpreter)
- v2 HEAD 보존: b14f1bbcfd574590a6cd13b5b662fa3e994bca2e — _archive는 게이트 통과 후 삭제(git이 곧 아카이브).
- 결정 1: Echo 게이트 신설 — 위임 작업 전 일상어 요약 확인 강제, `echo.confirmed !== true`면 Lock 불가(타입+코드 강제).
- 결정 2: confidence 폐기 → 결정론 필수 필드 체크리스트(intent/scope-files/done, 누락만 질문, max 1라운드).
- 결정 3: startup inventory 실코드화(scripts/inventory.js, 24h 캐시), hashline/worktree 비핵심 제외 — 필요 시 git b14f1bb 회수.
