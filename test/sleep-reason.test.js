'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classify, findSleepReason, getSleepReason } = require('../src/main/sleep-reason');

// Lines in the format `pmset -g log` prints (macOS 15).
const LOG = [
  'Time stamp                Domain              \tMessage                                                                  ',
  "2026-10-23 00:13:43 +0700 Sleep               \tEntering Sleep state due to 'Clamshell Sleep':TCPKeepAlive=active Using Batt (Charge:91%) 840 secs  ",
  '2026-10-23 12:47:46 +0700 Notification        \tDisplay is turned off                                                      \t          ',
  '2026-10-23 12:47:46 +0700 Assertions          \tPID 77959(Rosavin) Summary NoDisplaySleepAssertion "Electron" 00:16:17  id:0x0x50000a258 [System: PrevDisp DeclUser SRPrevSleep kCPU kDisp]          ',
  "2026-10-23 12:47:50 +0700 Sleep               \tEntering Sleep state due to 'Software Sleep pid=473':TCPKeepAlive=active Using AC (Charge:89%) 280 secs  ",
  '2026-10-23 12:52:30 +0700 DarkWake            \tDarkWake from Deep Idle [CDNP] : due to smc.70070000 wifibt SMC.OutboxNotEmpty/ Using AC (Charge:89%) 45 secs   ',
  "2026-10-23 12:53:15 +0700 Sleep               \tEntering Sleep state due to 'Maintenance Sleep':TCPKeepAlive=active Using AC (Charge:89%) 844 secs  ",
  '2026-10-23 12:55:41 +0700 Wake                \tWake from Deep Idle [CDNVA] : due to smc.70070000 pwrbtn SMC.OutboxNotEmpty/UserActivity Assertion Using AC (Charge:89%)           ',
].join('\n');

const at = (iso) => Date.parse(iso);

test('classify maps macOS sleep reasons', () => {
  assert.equal(classify('Software Sleep pid=473'), 'manual');
  assert.equal(classify('Power Button Sleep'), 'manual');
  assert.equal(classify('Clamshell Sleep'), 'lid');
  assert.equal(classify('Low Power Sleep'), 'battery');
  assert.equal(classify('Thermal Emergency Sleep'), 'thermal');
  assert.equal(classify('Idle Sleep'), 'idle');
  assert.equal(classify('Maintenance Sleep'), 'other');
});

test('finds the sleep that followed the suspend, not the later maintenance cycles', () => {
  const sleep = findSleepReason(LOG, at('2026-10-23T12:47:45+07:00'));
  assert.deepEqual(sleep, { at: at('2026-10-23T12:47:50+07:00'), reason: 'Software Sleep pid=473', kind: 'manual' });
});

test('reads the time zone offset of each line', () => {
  // 05:47:46 UTC is 12:47:46 in +07:00, just before the Software Sleep entry.
  assert.equal(findSleepReason(LOG, at('2026-10-23T05:47:46Z')).kind, 'manual');
});

test('earlier sleeps are ignored', () => {
  assert.equal(findSleepReason(LOG, at('2026-10-23T00:13:30+07:00')).kind, 'lid');
  assert.equal(findSleepReason(LOG, at('2026-10-23T13:30:00+07:00')), null);
});

test('getSleepReason is macOS only and tolerates a failing reader', async () => {
  const read = async () => LOG;
  assert.equal(await getSleepReason(at('2026-10-23T12:47:45+07:00'), { platform: 'win32', read }), null);
  assert.equal((await getSleepReason(at('2026-10-23T12:47:45+07:00'), { platform: 'darwin', read })).kind, 'manual');
  const broken = async () => {
    throw new Error('pmset missing');
  };
  assert.equal(await getSleepReason(Date.now(), { platform: 'darwin', read: broken }), null);
});
