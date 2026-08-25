# Palank Harness Spec — Thin Foundry + Knowledge Vault (Normative, 80 lines)

Version 0.2.0 · 2026-08-25 · Normative companion to `AGENTS.md` (50 lines)

> **AGENTS.md = how to act. SPEC.md = why it is shaped this way and how to verify it.**

This spec is the **reason document** for the harness. `AGENTS.md` is runtime constitution agents read every turn; this file is normative reference humans read for *why*. Enforcement in `scripts/check_vault.js`.

It instantiates Karpathy LLM Wiki pattern + fixed layout, machine-verifiable grounding, lifecycle loop, Trust Boundary.

## 1. Layout (fixed, root = vault)

```
<root>/
|-- AGENTS.md              # runtime constitution (canonical, 50 lines)
|-- SPEC.md                # this file — normative spec for humans (80 lines)
|-- index.md               # knowledge catalog — one line per page
|-- log.md                 # append-only audit ledger — parseable
|-- raw/                   # immutable sources — you own, agent never writes
|-- wiki/                  # LLM-owned compiled knowledge — concepts/ topics/ references/
`-- archive/               # fully superseded pages — isolated, never cascade-updated
```
Harness-owned runtime (not vault conformance, but foundry):
```
|-- opencode.json          # provider/model registry + routing (SSOT, tiers only)
|-- skills/interpreter/    # diary → schema → optimal call (60 lines)
|-- skills/verify/         # scaffold / lint / loop guard (60 lines)
|-- mcp/                   # MCP servers — one per domain, project-extensible
`-- scripts/check_vault.js # vault linter (Node, 116 lines, no Python)
```

## 2. The three layers
### 2.1 `raw/` — immutable sources (you own)
Curated source material: notes, papers, data, images. **Immutable**: agent reads, never writes. Only grounding authority. `raw/notes/`, `raw/data/`, `raw/assets/` — lazy creation.

### 2.2 `wiki/` — compiled knowledge (LLM owns)
LLM-written markdown. Agent creates/updates pages and cross-references. `wiki/concepts/`, `wiki/topics/`, `wiki/references/` — one line per page in index.md.

### 2.3 Schema — `AGENTS.md` (you and LLM co-evolve)
Single root file that tells agent vault structure and workflows. Keep short: only what breaks if forgotten mid-session. `AGENTS.md` 50 lines is canonical; `CLAUDE.md`/`GEMINI.md` are one-line pointers.

## 3. The two rails
`index.md` — one line per page: link + one-line summary + updated date. Agent updates every write. Progressive-disclosure: session reads index first, then pages — no RAG at moderate scale.

`log.md` — append-only, chronological. `## [YYYY-MM-DD] <op> | <title>` — `grep "^## \[" log.md | tail -5` returns history. Never confuse with page-internal `## Changelog`.

**Invariant: every write updates `index.md` + `log.md` together.** No index row + no log line = has not happened.

## 4. Grounding Invariant
Every wiki page declares `Raw:` pointing at `raw/`:
1. Verbatim for text — numbers/dates/quotes must appear verbatim in Raw. Grep before write.
2. Hash anchor for binaries — `sha256:<hash>`; linter verifies.
3. No wiki self-grounding — wiki page may never be sole grounding.
4. Derived values — computed values state components for traceability.
5. Universal Fingerprint — `Fingerprint: git:<hash>` + `Monitored: <paths>` → `git diff --name-only <hash> -- <paths>` 0-token drift.

Enforcement: `node scripts/check_vault.js --strict .` reports `0 errors, 0 suspects`. `wiki 0 && index 0 → PASS` skeleton at `check_vault.js:58`.

## 5. Lifecycle loop (event-based, No TTL)
Knowledge: `ingest → triage → New/Update/Disputed/No material`. Superseded → `Status: Outdated` block or move to `archive/YYYY-MM-DD/<path>`. `raw/` never deleted. Procedure: same error 2x → propose skill. Event-based GC only; time-based TTL never.

## 6. Operations
| Operation | What it does | Writes |
|---|---|---|
| `init` | Scaffolds layout, installs skills, writes schema, seeds wiki | yes |
| `ingest` | Source → `raw/` → triage → compile → cascade → index+log | yes |
| `query` | Index+full-text → cited answer; files good answers as pages | on request |
| `lint` | 3-tier: safe fixes, mechanical (`check_vault.js`), judgment | safe fixes |
| `loop` | Auto-skillifying, event GC, skill audit | proposal-first |

## 7. Conformance
1. Layout exists (`raw/`, `wiki/`, `index.md`, `log.md`, `AGENTS.md`, `SPEC.md`)
2. Every non-archive wiki page has `Raw:` resolving to `raw/`
3. `node scripts/check_vault.js --strict .` → `0 errors, 0 suspects` (skeleton 0/0 is pass)
4. Index row count matches page count (`check_vault.js:61` parity)
5. Every operation leaves parseable `log.md` entry

## 8. Trust Boundary and CI Lite
Local infinite loop (inside Trust Boundary): `conductor` delegates via `Task` to `interpreter`/`verify` (`AGENTS.md:26` + `plugins/force-delegation.js`). `verify` runs `lint && check:vault --strict && test && pack --dry-run` and loops until 0 errors. Catches logic errors but not **Contaminated Verifier** (mutated `check_vault.js` → `exit 0`).

CI Lite (outside Trust Boundary — Clean Room): `.github/workflows/gate.yml` runs same `lint` + `check:vault --strict` on `pull_request` in ephemeral runner (`fetch-depth:0` for drift). Uses pristine `main` checkout, not mutated local state. External audit + Final Gate. Minimal PR-only, no setup-node.

## 9. Non-goals
- No TTL — event-based only. Not read in 90 days says nothing about truth.
- No RAG/vectors at moderate scale — `index.md` + `grep` is auditable.
- No plugin/app/database — plain markdown, one schema, one spec, one linter.
- No deletion — everything moves to status or `archive/`; history survives.

## Appendix — Thin Foundry History
Vault-Base: git:7c2e97d — archived v1 entangled harness (435줄, hashline 185줄) → `archive/006-palank-harness-v1-20260825/`.
New skeleton: AGENTS 50 + SPEC 80 + skills 60+60 + check_vault 116 = <250 core. hashline/worktree in archive appendix, optional.
See `wiki/concepts/thin-foundry.md` for why thin, `archive/006-palank-harness-v1-20260825/SPEC.md` for v1 why.
Verification: `npm run verify` = lint + check:vault --strict + test + pack hygiene — zero errors required. CI Lite is gate.
Skeleton is not error — empty vault is valid initial state, not error (see check_vault.js:58). Verification: 0 errors required.
Harness principle: Framework (006) is foundry — thin, model-agnostic, disposable. Keep harness disposable: spec is asset.
Normative spec: SPEC.md (why), runtime constitution: AGENTS.md (how). See SPEC.md:8 Trust Boundary for isolation.
Hashline/worktree are appendix optional — 1 read/1 write, stale reject, pure Node, no Rust/Bun — see verify SKILL.md:4.
Vault-Base fingerprint: git history preserved via `git mv` → `git log --follow -- archive/.../AGENTS.md` tracks v1.
Change tier mapping in opencode.json:_routing_note 1 line — harness stays, no doc drift.
`mcp/palank-domain` stub exposes 3 tools — search_wiki, get_context, verify_before_tag — copy per project.
See AGENTS.md:50 Appendix for hashline/worktree optional relocation to scripts/optional/.
