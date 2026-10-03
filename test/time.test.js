'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const time = require('../src/shared/time');
const en = require('../src/shared/locales/en');
const vi = require('../src/shared/locales/vi');

test('formats durations', () => {
  assert.equal(time.formatDuration(0, en), 'Indefinitely');
  assert.equal(time.formatDuration(1, en), '1 minute');
  assert.equal(time.formatDuration(5, en), '5 minutes');
  assert.equal(time.formatDuration(60, en), '1 hour');
  assert.equal(time.formatDuration(120, en), '2 hours');
  assert.equal(time.formatDuration(90, en), '1 hour 30 minutes');
  assert.equal(time.formatDuration(90, vi), '1 giờ 30 phút');
  assert.equal(time.formatDuration(0, vi), 'Không giới hạn');
});

test('formats short chip labels', () => {
  assert.equal(time.formatDurationShort(0, en), '∞');
  assert.equal(time.formatDurationShort(15, en), '15m');
  assert.equal(time.formatDurationShort(60, en), '1h');
  assert.equal(time.formatDurationShort(90, en), '1h30');
  assert.equal(time.formatDurationShort(15, vi), '15p');
});

test('formats remaining time', () => {
  assert.equal(time.formatRemaining(45_000, en, 'long'), '45 sec');
  assert.equal(time.formatRemaining(60_000, en, 'long'), '1 min');
  assert.equal(time.formatRemaining(25 * 60_000, en, 'compact'), '25m');
  assert.equal(time.formatRemaining(65 * 60_000, en, 'long'), '1 h 05 min');
  assert.equal(time.formatRemaining(65 * 60_000, en, 'compact'), '1h05');
  assert.equal(time.formatRemaining(65 * 60_000, vi, 'long'), '1 giờ 05 phút');
  assert.equal(time.formatRemaining(-5, en, 'compact'), '0s');
});

test('validates durations and fills templates', () => {
  assert.equal(time.isValidDuration(30), true);
  assert.equal(time.isValidDuration(-1), false);
  assert.equal(time.isValidDuration(2.5), false);
  assert.equal(time.template('{a} and {b}', { a: 1 }), '1 and {b}');
  assert.ok(time.DURATION_PRESETS.includes(0));
  assert.ok(time.QUICK_DURATIONS.every((m) => time.DURATION_PRESETS.includes(m)));
});
