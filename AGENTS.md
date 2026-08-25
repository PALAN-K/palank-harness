# AGENTS.md — Palank Harness (Thin, 50-line constitution)

> Single source for ALL models. Thin harness reads this first. No per-model fork.

## Harness = Model + Guard
- **Model**: rented, swappable — tiers only; concrete `provider/model` in `opencode.json` SSOT
  - `tier:minimal` — title/summary, fastest
  - `tier:bulk-cheap` — bulk generation, cheap
  - `tier:terminal-strong` — terminal/tool-heavy
  - `tier:reasoning-frontier` — hard reasoning
- **Harness**: owned, deterministic — `interpreter`, `verify`, `MCP`

## Layout (fixed, 8 lines)
```
006 palank-harness/
|-- AGENTS.md              # this file — constitution
|-- opencode.json          # provider/model registry (SSOT)
|-- skills/interpreter/    # diary → schema → optimal call
|-- skills/verify/         # scaffold / lint / loop guard
|-- mcp/                   # MCP servers — one per domain
|-- wiki/ + raw/ + archive/ + index.md + log.md + package.json
`-- scripts/check_vault.js  # vault linter (Node, no Python)
```

## Rules (6 — Clarify is #3, front-loaded)
> **ALWAYS delegate via Task to interpreter/verify — NEVER direct write/edit/bash from conductor.**
1. **Interpreter first.** Diary → Schema → opencode optimal call. Dynamic wrapper (startup inventory → LLM selects).
2. **Verification over vibes.** `verify` runs `npm test` / `pack` itself. Model's "pass" is not a pass.
3. **Clarify Before Contract.** `confidence<0.7` or `intent=build|migrate`+`ambiguous(schema|intent|files)` → batch questions (2-5, Recommended+custom, max 1 round) → schema lock. Required only, optional defaults, max 1 round.
4. **Contracts before prompts.** Schema first, then code. No guessing without typed contract.
5. **Least privilege.** Subagents get only needed tools/files — never full repo.
6. **Knowledge as Asset + Isolation.** wiki is spec, harness is scaffolding. Every claim needs Raw. Every experiment in `git worktree` — never on `main` (`npm run sandbox:new <id>`).

## Model Routing (tiers only, 4 lines)
Concrete `provider/model` lives only in `opencode.json:_routing_note` 1 line — harness stays.
Tiers: `minimal`/`bulk-cheap`/`terminal-strong`/`reasoning-frontier`.
Swap 1 line, single tier OK. See `opencode.json:_routing_note` for mapping.

## Verification (3 lines)
`npm run lint` (syntax) + `npm run check:vault --strict` (evidence) + `npm test`.
`npm run verify` = all + `pack --dry-run` hygiene.
`wiki 0 && index 0 → PASS` skeleton — empty vault is valid initial state.

## MCP (3 lines)
One MCP per domain. `mcp/palank-domain` stub — copy per project, add tools.
`opencode.json:mcp.<name>.type ∈ {local,remote}` — local=stdio, remote=HTTP.
Keep `AGENTS.md` as contract, MCP implements it.

## Harness Principle + Spec (4 lines)
Framework `006` is foundry — thin, disposable. Keep harness disposable: spec is asset.
`SPEC.md` is why, this file is how. See `SPEC.md:8` Trust Boundary.
Enforcement lives in `scripts/check_vault.js`, not in prose.
Thin: 50 lines here, 80 in SPEC, 60+60 in skills — total <250.

## Appendix (optional, not core)
`scripts/hashline.js` + `scripts/worktree.js` are optional appendix — not core. See `archive/006-palank-harness-v1-20260825/scripts/` for full history.
`skills/verify/SKILL.md:4` for hashline protocol (LINE:HASH, 1 read/1 write, sha1 7hex).
<!-- hashline: optional LINE:HASH via scripts/hashline.js (1 read/1 write, sha1 7hex), see archive -->

<!-- vault: wiki 0 && index 0 → PASS (skeleton, see scripts/check_vault.js:58) -->
