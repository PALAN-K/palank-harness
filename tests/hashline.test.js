import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { shortHash, hashlineApplyContent, hashlineReplace } from '../scripts/hashline.js';

// helper: create temp file with content
function tmpFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hashline-'));
  const fp = path.join(dir, 'sample.txt');
  fs.writeFileSync(fp, content, 'utf8');
  return { dir, fp };
}

test('hashline batch edit success — file당 1 read/1 write (oh-my-pi 1-write 원칙)', () => {
  const before = 'line1: const greeting = "hi";\nline2: export { greeting };\nline3: console.log(greeting);\n';
  const { dir, fp } = tmpFile(before);

  const edits = [
    {
      oldText: 'const greeting = "hi";',
      newText: 'const greeting = "hello";',
      lineHint: 1,
      expectedHash: shortHash('const greeting = "hi";')
    },
    {
      oldText: 'console.log(greeting);',
      newText: 'console.log(greeting + "!");',
      lineHint: 3,
      expectedHash: shortHash('console.log(greeting);')
    }
  ];

  // In-memory apply first (no file drift)
  const memResult = hashlineApplyContent(before, edits);
  assert.match(memResult, /const greeting = "hello";/);
  assert.match(memResult, /console\.log\(greeting \+ "!"\);/);
  assert.equal(memResult.split('\n').length, before.split('\n').length); // line count stable (replace)

  // File apply: 1 read → 1 write
  const res = hashlineReplace(fp, edits);
  assert.equal(res.applied, 2);
  assert.equal(res.changed, true);
  const after = fs.readFileSync(fp, 'utf8');
  assert.equal(after, memResult);
  // verify original line numbers preserved semantics: edits were based on original line numbers
  assert.ok(after.includes('export { greeting };')); // untouched line preserved

  fs.rmSync(dir, { recursive: true, force: true });
});

test('hashline stale rejection — hash mismatch when file diverged (lineHint+hash 둘 다 불일치 시 거부)', () => {
  const before = 'const greeting = "hi";\nexport { greeting };\n';
  const { dir, fp } = tmpFile(before);

  // Simulate stale plan: we planned edit based on old before, but file has since changed
  // Edit expects oldText 'const greeting = "hi";' with its hash
  const staleEdit = {
    oldText: 'const greeting = "hi";',
    newText: 'const greeting = "hello";',
    lineHint: 1,
    expectedHash: shortHash('const greeting = "hi";')
  };

  // Mutate file externally before applying (simulates another agent edited file)
  fs.writeFileSync(fp, 'const greeting = "changed externally";\nexport { greeting };\n', 'utf8');

  // Should throw with message containing "hash mismatch — file changed since edit planned"
  assert.throws(() => hashlineReplace(fp, [staleEdit]), /hash mismatch — file changed since edit planned/);

  // Also test expectedHash tampering: planning hash does not match oldText (integrity)
  const tampered = {
    oldText: 'const greeting = "hi";',
    newText: 'x',
    lineHint: 1,
    expectedHash: 'deadbee' // wrong hash
  };
  // Even without file drift, direct content apply should reject hash mismatch
  assert.throws(() => hashlineApplyContent(before, [tampered]), /hash mismatch — file changed since edit planned/);

  // Both lineHint and global search fail → stale rejection
  const missingEdit = {
    oldText: 'nonexistent oldText 12345',
    newText: 'new',
    lineHint: 99,
    expectedHash: shortHash('nonexistent oldText 12345')
  };
  assert.throws(() => hashlineApplyContent(before, [missingEdit]), /hash mismatch — file changed since edit planned/);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('hashline insertion and offset descending — pure Node.js, no Rust/Bun', () => {
  const before = 'a\nb\nc\n';
  const edits = [
    { oldText: '', newText: 'HEAD\n', lineHint: 1, expectedHash: shortHash('') },
    { oldText: 'b', newText: 'B', lineHint: 2, expectedHash: shortHash('b') }
  ];
  // Insertion at head + replace middle — must preserve descending order logic
  const after = hashlineApplyContent(before, edits);
  assert.equal(after, 'HEAD\na\nB\nc\n');
});
