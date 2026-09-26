// Run with: npm test  (node's built-in runner; no extra dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSyncBlockReason, validateSyncDateRange, summarizeSyncError } from './tallySync.ts';

const ok = { savedCompany: 'Acme Ltd', isOnline: true, tallyReachable: true };

test('Start Sync is allowed only when company saved, agent online, Tally reachable', () => {
  assert.equal(getSyncBlockReason(ok), null);
});

test('Start Sync is blocked with the right reason', () => {
  assert.equal(getSyncBlockReason({ ...ok, savedCompany: null }), 'Select a Tally company first.');
  assert.equal(getSyncBlockReason({ ...ok, savedCompany: '  ' }), 'Select a Tally company first.');
  assert.equal(getSyncBlockReason({ ...ok, isOnline: false, tallyReachable: false }), 'The Tally Agent is offline.');
  assert.equal(getSyncBlockReason({ ...ok, tallyReachable: false }), 'Tally is not reachable.');
  // company message wins when nothing is selected, even if the agent is also offline
  assert.equal(getSyncBlockReason({ savedCompany: '', isOnline: false, tallyReachable: false }), 'Select a Tally company first.');
});

test('date range: requires both dates and from <= to', () => {
  assert.equal(validateSyncDateRange('', '2025-01-01').valid, false);
  assert.equal(validateSyncDateRange('2025-02-01', '2025-01-01').valid, false);
  assert.equal(validateSyncDateRange('2025-01-01', '2025-01-01').valid, true);
});

test('date range: limited to one year, inclusive', () => {
  assert.equal(validateSyncDateRange('2025-01-01', '2026-01-01').valid, true);
  assert.equal(validateSyncDateRange('2025-01-01', '2026-01-02').valid, false);
  assert.equal(validateSyncDateRange('2024-04-01', '2025-03-31').valid, true);
});

test('date range: sends YYYYMMDD', () => {
  const r = validateSyncDateRange('2025-04-01', '2025-06-30');
  assert.deepEqual([r.from, r.to], ['20250401', '20250630']);
});

test('error summary shortens long and raw database errors', () => {
  assert.equal(summarizeSyncError(''), null);
  assert.equal(summarizeSyncError('Tally not reachable').isLong, false);
  const raw = 'Invalid `prisma.voucher.create()` invocation in\nC:\\app\\src\\x.ts:10\n  Unique constraint failed';
  const s = summarizeSyncError(raw);
  assert.equal(s.isLong, true);
  assert.ok(s.short.length < 80);
  assert.equal(s.full, raw);
  assert.ok(summarizeSyncError('x'.repeat(300)).short.length <= 80);
});
