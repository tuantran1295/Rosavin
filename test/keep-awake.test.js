'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { KeepAwake, BLOCKER_TYPE } = require('../src/main/keep-awake');

function fakeBlocker() {
  let next = 1;
  const started = new Map();
  return {
    started,
    start(type) {
      const id = next++;
      started.set(id, type);
      return id;
    },
    stop(id) {
      started.delete(id);
    },
    isStarted(id) {
      return started.has(id);
    },
  };
}

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const blocker = fakeBlocker();
  const keepAwake = new KeepAwake({ powerSaveBlocker: blocker, now: () => Date.now() });
  return { blocker, keepAwake };
}

test('starts an indefinite session that keeps the display on', (t) => {
  const { blocker, keepAwake } = setup(t);
  const state = keepAwake.start({ minutes: 0, keepScreenOn: true });
  assert.equal(state.active, true);
  assert.equal(state.endsAt, null);
  assert.equal(state.blockerRunning, true);
  assert.deepEqual([...blocker.started.values()], [BLOCKER_TYPE.display]);
});

test('system-only mode uses the app-suspension blocker', (t) => {
  const { blocker, keepAwake } = setup(t);
  keepAwake.start({ minutes: 0, keepScreenOn: false });
  assert.deepEqual([...blocker.started.values()], [BLOCKER_TYPE.system]);
});

test('stop releases the blocker and emits a change', (t) => {
  const { blocker, keepAwake } = setup(t);
  const changes = [];
  keepAwake.on('change', (s) => changes.push(s.active));
  keepAwake.start();
  keepAwake.stop();
  assert.equal(keepAwake.active, false);
  assert.equal(blocker.started.size, 0);
  assert.deepEqual(changes, [true, false]);
});

test('timed sessions finish on their own', (t) => {
  const { blocker, keepAwake } = setup(t);
  const finished = [];
  keepAwake.on('finished', (e) => finished.push(e));
  const state = keepAwake.start({ minutes: 5 });
  assert.equal(state.endsAt, 1_000_000 + 5 * 60_000);
  t.mock.timers.tick(5 * 60_000 - 1);
  assert.equal(keepAwake.active, true);
  t.mock.timers.tick(1);
  assert.equal(keepAwake.active, false);
  assert.equal(blocker.started.size, 0);
  assert.deepEqual(finished, [{ durationMinutes: 5 }]);
});

test('reports the remaining time', (t) => {
  const { keepAwake } = setup(t);
  keepAwake.start({ minutes: 30 });
  t.mock.timers.tick(10 * 60_000);
  assert.equal(keepAwake.getState().remainingMs, 20 * 60_000);
});

test('switching screen mode keeps the session and leaves exactly one blocker', (t) => {
  const { blocker, keepAwake } = setup(t);
  const before = keepAwake.start({ minutes: 15, keepScreenOn: true });
  const after = keepAwake.setKeepScreenOn(false);
  assert.equal(after.endsAt, before.endsAt);
  assert.equal(after.keepScreenOn, false);
  assert.deepEqual([...blocker.started.values()], [BLOCKER_TYPE.system]);
});

test('restarting replaces the previous blocker', (t) => {
  const { blocker, keepAwake } = setup(t);
  keepAwake.start({ minutes: 5 });
  keepAwake.start({ minutes: 60 });
  assert.equal(blocker.started.size, 1);
  assert.equal(keepAwake.getState().durationMinutes, 60);
});

test('toggle flips the state', (t) => {
  const { keepAwake } = setup(t);
  assert.equal(keepAwake.toggle({ minutes: 0 }).active, true);
  assert.equal(keepAwake.toggle().active, false);
});

test('check() ends a session whose deadline passed while the computer slept', (t) => {
  const { keepAwake } = setup(t);
  keepAwake.start({ minutes: 10 });
  t.mock.timers.setTime(Date.now() + 11 * 60_000); // jump the clock without firing timers
  keepAwake.check();
  assert.equal(keepAwake.active, false);
});
