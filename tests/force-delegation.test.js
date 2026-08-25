import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlocked } from "../plugins/force-delegation.js";

test("blocks PowerShell write cmdlets (v3 patterns)", () => {
  for (const cmd of [
    'Set-Content -Path a.txt -Value "x"',
    'Add-Content -Path log.txt -Value "more"',
    '"data" | Out-File out.txt',
    "New-Item -ItemType File -Path new.txt",
    "New-Item new.txt -ItemType file",
    "[System.IO.File]::WriteAllText('a.txt','x')",
    "[System.IO.File]::WriteAllLines('a.txt', $lines)",
    "[System.IO.File]::AppendAllText('log.txt','x')",
    "[IO.File]::WriteAllBytes('bin',$b)",
    'node -e "require(\'fs\').writeFileSync(\'x.txt\',\'y\')"',
    'node -e "fs.appendFileSync(\'l.txt\',\'z\')"',
  ]) {
    assert.equal(isBlocked(cmd), true, `should block: ${cmd}`);
  }
});

test("blocks unix shell writes (v2 patterns kept)", () => {
  for (const cmd of [
    "echo hi > out.txt",
    "echo hi >> out.txt",
    "tail -f app.log | tee copy.log",
    "sed -i 's/a/b/' file.txt",
  ]) {
    assert.equal(isBlocked(cmd), true, `should block: ${cmd}`);
  }
});

test("allows reads and ordinary commands", () => {
  for (const cmd of [
    "ls",
    "Get-ChildItem -Force",
    "git status",
    "git diff --stat",
    "cat README.md",
    "npm run verify",
    "node scripts/inventory.js",
    'node -e "console.log(\'plain\')"',
    "Select-String -Path README.md -Pattern echo",
  ]) {
    assert.equal(isBlocked(cmd), false, `should allow: ${cmd}`);
  }
});
