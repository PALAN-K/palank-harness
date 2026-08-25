# Palank Harness Spec — Thin Foundry + Knowledge Vault (Normative)

Version 0.1.1 · 2026-08-23 · Normative companion to `AGENTS.md`

This spec is the **reason document** for the harness. `AGENTS.md` is the runtime constitution that agents read every turn; this file is the normative reference that humans and reviewers read to understand *why* the harness is shaped this way. Enforcement lives in `scripts/check_vault.js`, not in prose — this file declares the invariants that the linter enforces.

It instantiates Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern and adds what the pattern leaves open: a fixed layout, machine-verifiable grounding, a lifecycle loop, and a Trust Boundary.

> **AGENTS.md = how to act. SPEC.md = why it is shaped this way and how to verify it externally.**

## 1. Layout (fixed)

```
<root>/
├── AGENTS.md              # runtime constitution — agents read every turn (canonical)
├── SPEC.md                # this file — normative spec for humans/reviewers
├── CLAUDE.md              # one-line pointer → AGENTS.md (Claude Code)
├── GEMINI.md              # one-line pointer → AGENTS.md (Gemini CLI)
├── index.md               # knowledge catalog — one line per page
├── log.md                 # append-only audit ledger — parseable
├── raw/                   # immutable sources — you own, agent never writes
├── wiki/                  # LLM-owned compiled knowledge — concepts/ topics/ references/
└── archive/               # fully superseded pages — isolated, never cascade-updated
```

Additional harness-owned runtime (not part of vault conformance, but part of foundry):

```
├── opencode.json          # provider/model registry + routing (user selectable)
├── skills/interpreter/    # diary → schema → optimal opencode call
├── skills/verify/         # scaffold / lint / loop guard (model-agnostic)
├── mcp/                   # MCP servers — one per domain, project-extensible
├── plugins/               # runtime hooks (e.g., force-delegation)
└── scripts/check_vault.js # vault linter (Node, no Python)
```

The vault layout sits at the repo root — no hidden wrapper — so it is identical whether the vault is a code repo, a notes folder, or an Obsidian vault.

## 2. The three layers

### 2.1 `raw/` — immutable sources (you own)

Curated source material: notes, papers, data snapshots, images. **Immutable**: agent reads, never writes. Only grounding authority.

- `raw/notes/` — document snapshots (markdown)
- `raw/data/` — data snapshots
- `raw/assets/` — binary attachments (images, PDFs)

Layers are created lazily; unused layers are not required.

### 2.2 `wiki/` — compiled knowledge (LLM owns)

LLM-written markdown. Agent creates/updates pages and cross-references. You read it; agent writes it.

- `wiki/concepts/` — entities and concepts
- `wiki/topics/` — topic overviews
- `wiki/references/` — surveys, catalogs, decision records

### 2.3 Schema — `AGENTS.md` (you and LLM co-evolve)

Single root file that tells the agent how the vault is structured and what workflows to follow. Keep it short: only what breaks if forgotten mid-session. Canonical name is `AGENTS.md` (open cross-runtime standard); `CLAUDE.md`/`GEMINI.md` are one-line pointers — never second copies.

## 3. The two rails

**`index.md` (Knowledge Catalog)** — one line per page: link + one-line summary + updated date. Agent updates it on every write. Queries read the index first, then drill into pages. Progressive-disclosure engine: session starts by reading only the index, loads pages on demand — no RAG infrastructure at moderate scale.

**`log.md` (Vault Audit Ledger)** — append-only, chronological. Each entry starts with `## [YYYY-MM-DD] <op> | <title>` so `grep "^## \[" log.md | tail -5` returns recent history. `log.md` is the global ledger — never confused with a page-internal `## Changelog`.

**Invariant: every write updates `index.md` + `log.md` together.** A transition that leaves no index row and no log line has not happened.

## 4. Grounding Invariant

Every wiki page declares evidence in `Raw:` (or `Source:`) pointing at files inside `raw/`:

1. **Verbatim for text.** Every number, date, and direct quotation must appear verbatim in one of the `Raw:` files. Grep before write, copy exact form.
2. **Hash anchor for binaries.** Binary references carry `sha256:<hash>`; linter verifies file exists and matches.
3. **No wiki self-grounding.** A wiki page may never be another wiki page's sole grounding. That is a draft, not knowledge.
4. **Derived values.** Computed values (sums, deltas) must state components so each component is traceable to raw.
5. **Universal Fingerprint (Code Grounding & Drift Invariant).** Code-bound pages declare `Fingerprint: git:<hash>` and `Monitored: <paths>`:
   ```markdown
   > Fingerprint: git:abc1234
   > Monitored: src/App.tsx, package.json
   ```
   - **0-Token Drift Detection:** `git diff --name-only <hash> HEAD -- <paths>` — any output marks the page as drifted (`Status: Outdated` trigger). No LLM re-read of hundreds of files.
   - **Non-git:** `Fingerprint: sha256:<hash>` for single-file tracking.

Enforcement is mechanical: `node scripts/check_vault.js --strict .` extracts index parity, raw citations, and drift hashes and reports `0 errors, 0 suspects` required. `wiki 0 && index 0 → PASS (skeleton)` — empty vault is a valid initial state, not an error (skeleton check at `scripts/check_vault.js:59`).

## 5. The lifecycle loop

Wiki is a stateful store; nothing is ever deleted — superseded material moves through statuses:

### 5.1 Knowledge lifecycle (facts)

```
ingest ──triage──▶ New ───────────────▶ page
        │         Update ────────────▶ merge into existing page
        │         Disputed ──────────▶ Status: Disputed block (both claims + sources)
        └───────── No material ──────▶ log only, no compilation
```

- **Status blocks.** Superseded claims keep history: `Status: Outdated` (date + what changed + source) or `Status: Disputed` (competing claims + sources).
- **Event-based GC.** Dependency or source change triggers cross-validation: partial obsolescence → `Status: Outdated` block; full replacement → move page to `archive/YYYY-MM-DD/<path>` and remove from index. `raw/` is never deleted. No time-based TTL.
- **No TTL.** "Not read in 90 days" says nothing about truth. Invalidation is event-driven, not clock-driven.

### 5.2 Procedure lifecycle (skills)

- **Auto-skillifying.** Same error fixed twice or same solution applied twice in one session → propose promoting procedure into a skill. Human approval required. Search existing skills first — merge if a home exists. Skills live in runtime skills dir (`.agents/skills/`, `.opencode/skills/`), never inside `wiki/`.
- **Skill audit.** Periodically review skill coverage against actual stack and verify technical claims against official docs.

### 5.3 Role separation

**Wiki = knowledge** (facts, decisions, evidence). **Skills = procedures** (how to). When something is both, fact goes in wiki, procedure goes in a skill that links the wiki page.

## 6. Operations

| Operation | What it does | Writes |
|---|---|---|
| `init` | Scaffolds layout, installs skills, writes schema, seeds wiki | yes |
| `ingest` | Source → `raw/` → triage → compile → cascade → index + log | yes |
| `query` | Index + full-text search → cited answer; files good answers back as pages | on request |
| `lint` | 3-tier health check: safe fixes (auto), mechanical (`check_vault.js`), judgment (contradictions/stale/orphans) | safe fixes |
| `loop` | Auto-skillifying, event-based GC, skill audit | proposal-first |

## 7. Conformance

A vault conforms when:

1. Layout exists (`raw/`, `wiki/`, `index.md`, `log.md`, `AGENTS.md`, `SPEC.md`)
2. Every non-archive wiki page has a `Raw:` field resolving to files inside `raw/`
3. `node scripts/check_vault.js --strict .` reports `0 errors, 0 suspects` (skeleton `0/0` is pass)
4. Index row count matches actual page count (`scripts/check_vault.js:61` parity)
5. Every operation leaves a parseable `log.md` entry

## 8. Trust Boundary and CI Lite

The harness enforces correctness in two independent layers — local infinite-loop verification and an external Clean Room gate. Neither replaces the other:

- **Local infinite loop (inside Trust Boundary):** `conductor` delegates via `Task` to `interpreter`/`verify` (`AGENTS.md:30` + `plugins/force-delegation.js:11`). `verify` runs `npm run lint && npm run check:vault --strict && npm test && npm pack --dry-run` itself (`skills/verify/SKILL.md:54` Preflight) and loops on failure until `0 errors`. This catches logical errors before they leave the machine. But it cannot catch **Contaminated Verifier** — if `check_vault.js` or `opencode.json` is mutated to `exit 0`, the loop sees only the mutated verifier and reports "pass" forever.

- **CI Lite (outside Trust Boundary — Clean Room):** `.github/workflows/gate.yml` runs the same `lint` + `check:vault --strict` on `pull_request` in GitHub's ephemeral runner (`fetch-depth: 0` for `git cat-file -e <hash>` drift checks). It uses the pristine `main` checkout, not the local mutated state. It is the **external audit** that provides Objective Evidence (green check) and the Final Gate against human `--skip-verify` or polluted local state.

Design choice: CI Lite is intentionally minimal (PR-only, no `setup-node` required, `node --check` + `check_vault.js` only) to preserve `AGENTS.md:56` Thin/Disposable principle. Local is nudge, CI is gate (`wiki-manager` loop `AGENTS.md:19` heritage). The infinite loop guarantees convergence; CI Lite guarantees the convergence was honest.

## 9. Non-goals

- **No time-based TTL or access-frequency decay.** Event-based invalidation only.
- **No RAG/vectors/knowledge graphs at moderate scale.** `index.md` + `grep` is more reliable and auditable up to hundreds of pages. Revisit only when retrieval measurably degrades.
- **No plugin/app/service/database.** Plain markdown in a folder, one schema file, one spec file, one skill set, one linter.
- **No deletion.** Everything moves to a status or `archive/`; history survives.
