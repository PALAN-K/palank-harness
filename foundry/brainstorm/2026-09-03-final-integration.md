# Final Integration Brainstorm — 2026-09-03 (ONE batch)

> ONE batch: fact-corrections 7항 + wiki 7-standard structure + foundry hermetic guard
> Vault parity: 5/5 유지, Thin·Zero-Dep, check_vault PASS 전제

## Fact Corrections (7항)

### 1. Billing — 모델 라우팅 SSOT
- `opencode.json#model` (xhigh)이 전 담당 단일 SSOT, small_model은 opencode-go/muse-spark-1.2-contributor
- 전제: 과금·엔드포인트는 relay proxy(`005-relay-proxy.vercel.app`) 경유, 프로젝트별 하드코딩 금지

### 2. --no-verify 차단 — force-delegation 3줄
- `plugins/force-delegation.js` DESTRUCTIVE_PATTERNS에 `/\B--no-verify\b/` 추가
- isDestructive()가 identity===null 분기에서도 전역 차단 (AI의 `git commit --no-verify` 무력화)
- isBlocked()도 동일 패턴 커버 → conductor + unknown 모두 FAIL-CLOSED

### 3. Memory externalization — zero-dep (fs, path only)
- `scripts/tiered-verify.js`의 verify-history 로깅은 Node stdlib(fs, path)만 사용
- 외부 DB/의존성 없이 `foundry/verify-history.jsonl` append-only로 외부화
- `try { mkdirSync; appendFileSync(...payload+ts...) } catch(e){}` — 실패해도 verify 자체는 PASS

### 4. wiki/raw/log 분리
- wiki: 지식 볼트 (check_vault 대상, `> Raw:` 필수, index parity)
- raw: 원천 증거 (vault 밖 아님, wiki가 참조하는 근거)
- log.md: append-only 감사 장부 (역사성, sync-version 제외)
- foundry는 vault도 raw도 아님 — 브레인스토밍·템플릿·히스토리 전용, npm pack 제외

### 5. Foundry reason — foundry vs harness vs vault
- foundry: 일회성·실험·템플릿·히스토리 격리 (harnesses에 오염 금지)
- harness: 기계적 게이트·검증의 SSOT (thin 헌법)
- vault: 인간·LLM 지식 캐시 (wiki/raw/index)
- 용어 혼동이 v2→v3 전환 실패의 원인 → `wiki/concepts/terminology.md`에서 5대 분리 명문화

### 6. Hermetic per-project
- foundry/verify-history.jsonl은 per-project hermetic (repo 루트에만 존재)
- Global(`~/.config/opencode/opencode.json`)과 분리, 프로젝트 이식 시 자립
- `.gitignore`에 예외 주석: "foundry/verify-history.jsonl is INTENTIONALLY tracked (audit) — do not ignore"
- `.verify-tier.json`은 sidecar로 gitignore 유지 (증거 검증용, pack 제외)

### 7. Thin·Zero-Dep 검증 패키지
- files 허용목록은 `package.json#files`에서 foundry 제외 (tarball 오염 차단)
- Thin 3 agents만 허용 — `.opencode/agent/*.md` 생성 금지, check_vault e항에서 FAIL
- 모든 스크립트는 ESM + Node stdlib만 사용, `node --check` lint PASS

## Wiki 7-표준 구조 rationale (forest vs tree)

- 기존: concepts/topics/references 3축 → 평면 나열, decision·release·architecture·gotchas가 섞임
- 신규 7표준: architecture / decisions / releases / gotchas / concepts / topics / references / archive
  - architecture: 시스템 구조·레이아웃·헌법 해석
  - decisions: ADR (foundry/templates/adr-template.md → wiki/decisions/로 승격)
  - releases: 릴리스 노트·cherry-pick matrix
  - gotchas: 함정·실패 사례·재발 방지선
  - concepts/topics/references: 기존 유지 (하위 호환)
  - archive: 퇴역·superseded 문서
- forest(숲) 관점: wiki는 트리 1개가 아니라 숲 — 각 디렉터리는 독립적 탐색 트리
- tree(나무) 관점: index.md가 숲의 지도 — parity 5/5 유지, 빈 디렉터리는 headers only (bullet 없음)로 skeleton PASS
- `.gitkeep`으로 빈 디렉터리 추적, check_vault는 `.gitkeep` 필터 (`basename !== '.gitkeep'`)로 무시

## Design diagram

```
006 palank-harness/
├── AGENTS.md              # thin constitution v3.2 + foundry line
├── opencode.json          # SSOT, 3 agents, permission.bash
├── index.md               # 5 bullets exact + 5 empty headers (architecture etc headers only)
├── log.md                 # append 2026-09-03 section
├── .gitignore             # foundry/verify-history tracked comment
├── foundry/               # hermetic, excluded from npm pack
│   ├── .gitkeep
│   ├── verify-history.jsonl  # append-only tier log (created 2026-09-03)
│   ├── brainstorm/2026-09-03-final-integration.md  # this file
│   └── templates/{adr,release}-template.md
├── wiki/
│   ├── concepts/ (3 files)
│   ├── topics/ (1 file)
│   ├── references/ (1 file)
│   ├── architecture/.gitkeep
│   ├── decisions/.gitkeep
│   ├── releases/.gitkeep
│   ├── gotchas/.gitkeep
│   └── archive/.gitkeep   # 5/5 parity 유지 — headers only in index.md
├── scripts/
│   ├── tiered-verify.js   # foundry log append
│   └── pre-commit         # hermetic hook (check_vault·tiered 체크)
├── plugins/force-delegation.js # --no-verify block
└── .git/hooks/pre-commit  # symlink -> ../../scripts/pre-commit
```

## Execution plan (atomic, check_vault PASS throughout)

1. 골격: mkdir -p wiki/* foundry/* + .gitkeep 5개 + verify-history.jsonl header + 본 브레인스토밍
2. 템플릿: adr-template.md / release-template.md (Status, Raw, Vault-Base, Cherry-pick Matrix)
3. 문서: index.md headers only, AGENTS.md Layout에 foundry 라인, .gitignore 주석, log.md 2026-09-03 절
4. 가드: force-delegation --no-verify, tiered-verify foundry append, pre-commit sh + chmod +x
5. 훅 연결: ln -sf ../../scripts/pre-commit .git/hooks/pre-commit (fallback cp)
6. 검증: npm run verify (lint+check:vault --strict+test+check:version+pack), isDestructive('git commit --no-verify')===true, pack excludes foundry, verify-history append 확인

> Raw: not required — foundry/ is outside vault (check_vault 대상 아님), hermetic per-project
> Vault-Base: git:HEAD (thin v3.2 skeleton)
