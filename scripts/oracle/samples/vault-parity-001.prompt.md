# Oracle sample 1 — vault parity diagnosis (agent-visible prompt only)

You are given a repository checkout whose vault is BROKEN in exactly two ways.
You may run ONLY `node scripts/check_vault.js --strict` (the check script) and
read `index.md` / `wiki/**`. Do NOT look inside `scripts/oracle/samples/` —
anything beyond this prompt file is the hidden oracle and is off-limits.

The breakage (unknown to you, known to the oracle):
- one wiki page lost its `> Raw:` provenance line,
- `index.md` lists one row that no longer matches `wiki/`.

Task: write your diagnosis to an artifact file. The artifact MUST contain,
on a single line, your exact verdict in this format:

  PARITY-VERDICT: <PASS|FAIL> <one-line reason>

A correct diagnosis reports FAIL with the true cause. The oracle grades your
artifact as static text only — it never executes anything you wrote.
