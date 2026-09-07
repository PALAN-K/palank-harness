# Transplant Checklist — skill auto-install (thin)

> Copy-target checklist for next transplant. SSOT: `opencode.json: skills: ["./skills"]`.

## Auto-copy (cp -a, no init)

- [ ] `cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ ~/projects/<target>/`
- [ ] `skills/excalidraw/SKILL.md` + `skills/excalidraw/references/` included (mirror+inbox)
- [ ] `skills/interpreter/SKILL.md` + `skills/verify/SKILL.md` + `skills/reviewer/SKILL.md` included (4/4)
- [ ] 금지 준수: `opencode init`·`npx harness-bootstrap`·`.opencode/agent/*.md`·`.opencode/skills` 생성 금지, 전역(`~/.config`, `/mnt/c`)·릴레이·카톡/Lovable 무접촉

## Auto-register (no restart)

- [ ] `opencode.json` has `skills: ["./skills"]` (agents 3개 유지, `reviewer`는 skill, agent 아님, `_thin_warning` 무수정)
- [ ] `npm run inventory --refresh` shows `skill:excalidraw` + 4/4, no missing WARNING
- [ ] `node scripts/check_vault.js --strict` shows `skill files ok (4/4)` + `skills[] ok`, WARNING only on drift
- [ ] `wiki/architecture/*.md` 이식 후 `npm run sync:architecture`로 `architecture.html` 재생성

## Verify

- [ ] `npm run verify:quick` PASS → `npm run verify:tiered` (FULL 예상) → `npm run verify` FULL 6단 PASS
- [ ] tag 금지, push 보류, 원자커밋 1개 (`commit-msg` 게이트)
