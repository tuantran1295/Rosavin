'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Session } = require('../src/main/session');

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const calls = [];
  const session = new Session({ effects: { start: () => calls.push('start'), stop: () => calls.push('stop') }, now: () => Date.now() });
  return { session, calls };
}

test('starts and stops, running effects once each', (t) => {
  const { session, calls } = setup(t);
  assert.equal(session.start().active, true);
  session.start({ minutes: 30 }); // restart keeps the effect running
  assert.equal(session.stop().active, false);
  assert.deepEqual(calls, ['start', 'stop']);
});

test('timed sessions finish on their own', (t) => {
  const { session } = setup(t);
  const finished = [];
  session.on('finished', (e) => finished.push(e));
  session.start({ minutes: 5 });
  t.mock.timers.tick(5 * 60_000);
  assert.equal(session.active, false);
  assert.deepEqual(finished, [{ durationMinutes: 5 }]);
});

test('check() ends a session whose deadline passed during sleep', (t) => {
  const { session } = setup(t);
  session.start({ minutes: 10 });
  t.mock.timers.setTime(Date.now() + 11 * 60_000);
  session.check();
  assert.equal(session.active, false);
});
