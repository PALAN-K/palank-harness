# Release Template

> Copy to wiki/releases/vX.Y.Z.md when tagging

## Release vX.Y.Z — YYYY-MM-DD

### Cherry-pick Matrix

| Source (upstream) | Cherry-picked | Kept (upstream only) | Dropped | Notes |
|---|---|---|---|---|
| log.md entries |  |  |  | history is per-repo, not cherry-picked |
| wiki/concepts/* |  |  |  |  |
| wiki/decisions/* |  |  |  | ADR promotion |
| wiki/releases/* |  |  |  |  |
| scripts/* |  |  |  | harness sync |
| plugins/* |  |  |  | guard sync |

### Vault-Base

- Vault-Base: git:HEAD (replace with `git rev-parse HEAD` at release)
- Upstream HEAD: (git log --oneline -1)

### Changes

#### Kept

- 

#### Cherry-picked

- 

#### Dropped

- 

### Verification

- [ ] npm run verify PASS (lint + check:vault --strict + test + check:version + pack)
- [ ] npm pack --dry-run excludes foundry/
- [ ] opencode debug config --print-logs shows no "failed to load plugin"

> Raw: raw/notes/release-evidence.md (required when promoted)
