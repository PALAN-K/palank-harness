# Oracle spike — held-out grading mechanism (scripts/oracle/)

Spike goal: prove that a hidden test case can be recorded, hash-sealed, and
graded against an agent's static output — without the agent ever seeing the
answer and without touching the base verify 6-stage chain.

## 1. Two-layer structure

- **Static layer (mechanism, committed):** `record.js` → `seal.js` → `grade.js`.
  Stdlib-only ESM (`node:crypto`, `node:fs`, `node:path`). This layer never
  changes per case and is safe to review, pack, and lint like any script.
- **Dynamic layer (cases, per-case files):** `samples/<name>.prompt.md`
  (agent-visible) + `samples/<name>.sealed.json` + `.sha256` sidecar
  (oracle-hidden). Only the prompt is shown to the agent under test; the
  sealed files are the hidden oracle. Grading input is the agent's artifact
  file, read as opaque text.

Isolation rule: the agent under test sees the check script
(`scripts/check_vault.js`) and the `.prompt.md` only. Sealed files and
expected markers are never printed by `record.js` (paths + hashes only).

## 2. Grading scope — static artifacts only, no agent execution

`grade.js` READS the artifact as UTF-8 text and compares it against the
sealed rule (`contains` substring or `exact_hash` sha256). It NEVER imports,
spawns, or evaluates artifact content — no agent code runs in the grader
process. Verdicts: `PASS` (exit 0), `FAIL` (exit 1, wrong answer),
`TAMPERED` (exit 2, sealed.json malformed or sidecar hash mismatch).
`TAMPERED` means the case itself was altered, not that the agent failed.

## 3. Record regeneration procedure (sample 1)

```sh
node scripts/oracle/record.js --out scripts/oracle/samples \
  --case vault-parity-001 \
  --prompt scripts/oracle/samples/vault-parity-001.prompt.md \
  --expected "PARITY-VERDICT: FAIL raw-missing plus index-skew" \
  --rule contains
node scripts/oracle/seal.js scripts/oracle/samples/vault-parity-001.sealed.json
# demo (static grading, no agent is executed):
node scripts/oracle/grade.js --sealed scripts/oracle/samples/vault-parity-001.sealed.json \
  --artifact scripts/oracle/samples/vault-parity-001.pass.txt   # PASS exit 0
node scripts/oracle/grade.js --sealed scripts/oracle/samples/vault-parity-001.sealed.json \
  --artifact scripts/oracle/samples/vault-parity-001.fail.txt   # FAIL exit 1
# TAMPERED demo uses a /tmp copy with an edited rule (never committed):
#   grade prints TAMPERED, exit 2 (sidecar hash mismatch)
```

Honest limits of sample 1: it demonstrates the mechanism end-to-end, but its
difficulty is NOT calibrated — the marker is stipulated, not derived from a
genuinely hard diagnosis. The committed `.sealed.json` is demo-only; real
held-out cases must live out-of-tree (never committed, never packed).

## 4. Next wiring proposal — base 6-stage chain NOT incorporated (opt-in)

How the spike stays out of the base chain (this is the method, by design):

1. `package.json` `verify` (lint → check:vault → test → check:version →
   check:architecture → pack) is UNMODIFIED in this spike — verified by
   `git diff` showing only `scripts/oracle/` additions.
2. `scripts/` is already in the `files` pack list, so `scripts/oracle/` is
   thin-auto-included in `npm pack --dry-run` (58 → 66 files, no config edit).
3. `lint` does not enumerate the new files yet (also untouched); wiring adds
   three `node --check scripts/oracle/*.js` entries when promoted.

Proposed opt-in wiring (future PR, NOT applied here):

```json
{ "scripts": { "verify:oracle": "node scripts/oracle/grade.js --sealed <case> --artifact <out>" } }
```

`verify:oracle` stays a SEPARATE script: daily work runs `verify`/`verify:quick`
unchanged; oracle grading runs only when a held-out evaluation is requested.
Promotion checklist: lint entries → `verify:oracle` script → sample difficulty
calibration → out-of-tree sealed-case storage.
