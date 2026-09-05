import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlocked, taskGateOk } from "../plugins/force-delegation.js";

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
    "python -c \"open('a.txt','w').write('x')\"",
    "python3 -c \"open('a.txt','w').write('x')\"",
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

test("blocks destructive + space-less redirect + heredoc + PS aliases (v3.2 P1-2)", () => {
  for (const cmd of [
    "rm -rf build",
    "del old.txt",
    "Remove-Item -Path old.txt",
    "ri app.log",
    "echo hi >out.txt", // space-less redirect
    "echo hi >>out.log",
    "git status 2>err.log",
    "cat <<EOF", // heredoc syntax
    "node -e \"console.log($x = @'herestring'@)\"", // PS here-string opener
    "sc -Path a.txt -Value x", // Set-Content alias
    "ac log.txt extra", // Add-Content alias
    "ni new.txt", // New-Item alias
    "mi a.txt backup.txt", // Move-Item alias
  ]) {
    assert.equal(isBlocked(cmd), true, `should block: ${cmd}`);
  }
});

test("stream merges and null sinks stay allowed (over-blocking guard)", () => {
  for (const cmd of [
    "git status 2>&1",
    "Get-ChildItem missing-dir 2>$null",
    "Write-Host done >$null",
    'node -e "[1,2].map(n => n * 2)"', // arrow fn must not trip redirect regex
  ]) {
    assert.equal(isBlocked(cmd), false, `should allow: ${cmd}`);
  }
});

test("isDestructive marks rm/del/Remove-Item/ri family (universal fallback)", async () => {
  const { isDestructive } = await import("../plugins/force-delegation.js");
  assert.equal(isDestructive("rm -rf build"), true);
  assert.equal(isDestructive("Remove-Item -Recurse x"), true);
  assert.equal(isDestructive("git status"), false);
});

test("allows sc.exe Service Control while still blocking sc alias (P3' refinement)", () => {
  for (const cmd of ["sc.exe query", "sc.exe stop MyService", "SC.EXE start MyService"]) {
    assert.equal(isBlocked(cmd), false, `should allow: ${cmd}`);
  }
  for (const cmd of [
    "sc -Path a.txt -Value x",
    "sc log.txt extra",
    "ac log.txt extra",
    "ni new.txt",
    "mi a.txt backup.txt",
  ]) {
    assert.equal(isBlocked(cmd), true, `should still block: ${cmd}`);
  }
});

test("gate precise match: leading gate passes, body citation rejected (L3-2)", () => {
  for (const p of [
    "gate:echo-confirmed intent=X scope/files=[a] done=Y",
    "  gate:echo-confirmed intent=X scope/files=[a] done=Y",
    "gate:research-exempt intent=research scope/files=[wiki] done=notes",
    "\tgate:research-exempt intent=research",
    "intro line\ngate:echo-confirmed intent=X scope/files=[a] done=Y",
    "intro\n  gate:echo-confirmed intent=X",
  ]) {
    assert.equal(taskGateOk(p), true, `should pass: ${JSON.stringify(p)}`);
  }
  for (const p of [
    "use `gate:echo-confirmed` as example",
    "see gate:echo-confirmed in docs",
    'Example: Task(prompt="gate:echo-confirmed intent=...")',
    "본문에서 gate:echo-confirmed 인용은 거부",
    "prefix gate:echo-confirmed suffix",
    "gate:echo-confirmedX",
    "",
  ]) {
    assert.equal(taskGateOk(p), false, `should reject: ${JSON.stringify(p)}`);
  }
  assert.equal(taskGateOk(undefined), false, "should reject undefined");
  assert.equal(taskGateOk(null), false, "should reject null");
});
