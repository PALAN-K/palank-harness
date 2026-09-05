# ADR 001 — Canvas 격하 (md=master, canvas=mirror+inbox, html=derived)

Vault-Base: git:b14f1bbcfd574590a6cd13b5b662fa3e994bca2e

> Raw: raw/notes/v3-charter.md

## Status

- Proposed: 2026-09-05
- Accepted: 2026-09-05
- Superseded by: (empty)

## Decision

`wiki/architecture/*.md`를 유일 원본(Ledger)으로 유지하고, `architecture.excalidraw`를 md 기준 거울 plus 스티키 접수함(View+Inbox)으로 격하하며, `architecture.html`을 md 핵심(계층+Changelog)만 뽑는 자동뷰(derived)로 고정한다.

## Context

- walkthrough는 양방향 실시간(캔버스 제스처→AI 직접 실행, Zero-CLI 자동완결)을 완성했다고 기록했으나, 이는 3중 SSOT(`.excalidraw` vs `.html` vs `.md`) drift를 만든다. 실측: 0010은 draw 60K/html 30K 수동 재구현에 스크립트 0건(반면교사), 006 stub 스크립트는 excalidraw 전체 파싱 방향(역방향)이었다.
- `.agents/skills/excalidraw/` 중복은 `inventory`/`check_vault` 사각지대(전자는 `.agents` 미집계, 후자는 `.opencode/`만 검사)라서 drift가 기계 게이트를 우회한다.
- 루트 `architecture.*`(draw 1016줄/html 575줄)는 untracked 상태로 tiered를 영구 FULL에 가두며(FULL 고착), pack files에는 미포함이라 tarball 정합과도 어긋난다.

## Rationale

- md가 Raw 인용 plus index 패리티 plus 해시 도달성을 그대로 상속받아 신규 게이트 0개로 SSOT를 강제한다 (vault-native, zero-code leverage).
- 스티키는 초보자도 판단 가능한 diary 원문이며, Echo 요약+사용자 확인이 강제되므로 guardian `yes` 없이는 실행 불가다 (v3 철학 3·4호: Clarify before contract, Echo before dispatch).
- Changelog 진실은 `package.json` 버전+`log.md` ledger이며, 캔버스 카드는 거울 복사다. html은 idempotent 생성기(`sync-architecture.js`, 타임스탬프 미포함)로 재생성되어 재실행 drift가 없다.
- 대안 기각: foundry 이동안은 walkthrough 루트 경로 참조를 깨뜨리므로 기각하고 루트 유지+pack-excluded+Allowlist 등록을 택한다. `.excalidraw` 완전 삭제안은 초보자 바이브코딩 접수함을 잃으므로 기각한다.

## Consequences

- Positive: SSOT 1개로 drift 차단, 초보자 규칙 단순화(md 고치고 스크립트 1회), 레거시 꼬임 방지(중복 삭제, Allowlist zombie 검출).
- Negative: 캔버스 편집만으로는 코드가 바뀌지 않아 Zero-CLI 기대와 어긋난다 (의도적 마찰, 안전 우선).
- Risks: 기존 walkthrough의 양방향 문구가 레거시로 남는다. 완화: 본 ADR+`skills/excalidraw/SKILL.md` Echo 매핑이 정본이며 walkthrough는 역사 기록으로 취급한다.

## Links

- SSOT: wiki/architecture/006-overview.md
- Flow: wiki/architecture/006-pipeline.md
- Renderer: scripts/sync-architecture.js
- Skill: skills/excalidraw/SKILL.md
