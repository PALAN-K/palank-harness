import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

test('opencode.json valid', () => {
  JSON.parse(fs.readFileSync('opencode.json', 'utf8'));
  assert.ok(true);
});

test('AGENTS.md exists', () => {
  assert.ok(fs.existsSync('AGENTS.md'));
});
