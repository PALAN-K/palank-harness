# Thin Foundry — why thin, why disposable

> Foundry is disposable, knowledge is asset. Harness enforces spec, spec survives model swap.
> Vault-Base: git:7c2e97d
> Monitored: AGENTS.md, SPEC.md, skills/interpreter/SKILL.md, skills/verify/SKILL.md
> Raw: archive/006-palank-harness-v1-20260825/SPEC.md
> Updated: 2026-08-25

## Summary
Thin Foundry v2 distills v1 entangled harness (435줄, hashline 185줄) to <250 core: AGENTS 50 + SPEC 80 + skills 60+60 + check_vault 116. Hashline/worktree demoted to `archive/.../scripts/` appendix, not core. Every experiment runs in `git worktree` — never on `main`.

## Why thin
- **Model is rented, harness is owned** — tier routing only in `opencode.json:_routing_note` 1 line; docs reference tiers, swap 1 line.
- **Verification over vibes** — `verify` runs `npm test`/`pack` itself; local infinite loop + CI Lite Clean Room (PR-only, fetch-depth:0) guards Contaminated Verifier.
- **Contracts before prompts** — schema first, then code; no guessing without typed contract.
- **Least privilege** — subagents get only needed tools/files.
- **Knowledge as Asset** — wiki is spec, harness is scaffolding; every claim needs Raw verbatim; event-based GC, No TTL.
- **Clarify Before Contract** — `confidence<0.7` or `build|migrate` ambiguous → batch questions (2-5, Recommended+custom, max 1 round) → schema lock. `AGENTS.md:3` (was #6, promoted to #3).

## What changed v1→v2
- AGENTS.md 74→50 lines (Harness 6 + Layout 8 + Rules 18 + Routing 4 + Verification 3 + MCP 3 + Principle 4 + Appendix 4)
- SPEC.md 150→80 lines (why + Trust Boundary + Vault 3-layer retained, history appendix added)
- skills/interpreter 126→60 lines (dynamic inventory 5 + GRILL 10 + Flow 15 distilled), skills/verify 95→60 lines (scaffold 10 + 3tier 15 + hashline appendix 1)
- `opencode.json` tier SSOT retained (`_routing_note` 1 line) — see `tier/migration` branch for `_routing_note` cherry-pick source.
- `scripts/hashline.js` (185줄) + `scripts/worktree.js` (66줄) → `scripts/optional/` + `archive/.../scripts/` appendix — not required for `npm run verify` core (lint + check:vault + test + pack).

## How to verify
`npm run lint` (opencode.json + mcp/server.js + scripts/check_vault.js + bin/cli.js) + `npm run check:vault --strict` (0 errors, wiki 0 && index 0 → PASS skeleton, now 1 page) + `npm test` + `npm pack --dry-run` hygiene. Zero errors required.

## References
- Raw: `archive/006-palank-harness-v1-20260825/SPEC.md` — v1 normative why (150 lines, Trust Boundary)
- Raw: `archive/006-palank-harness-v1-20260825/AGENTS.md` — v1 constitution (74 lines)
- Raw: `archive/006-palank-harness-v1-20260825/skills/interpreter/SKILL.md` — v1 full wrapper (126 lines)
- See `archive/006-palank-harness-v1-20260825/scripts/hashline.js` for hashline full protocol (LINE:HASH, 1 read/1 write, sha1 7hex, stale reject, pure Node).

## Status
Active — skeleton verified. Next: cherry-pick `tier/migration` opencode.json `_routing_note` + `plugins/force-delegation.js` + `mcp/server.js` + `scripts/check_vault.js` + `dynamicSubAgents.json` + `templates/` + `bin/cli.js` (already restored from archive) — then `npm run verify` + `npm pack --dry-run` + grep for model names + gate.yml check.