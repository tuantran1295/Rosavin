'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PROTOCOL, parseArgv, parseUrl } = require('../src/main/commands');

test('parses flags and ignores Chromium switches', () => {
  assert.deepEqual(parseArgv(['app', '--start=30', '--remote-debugging-port=0']).commands, [{ action: 'start', minutes: 30 }]);
  assert.deepEqual(parseArgv(['app', '--toggle', '--hidden']), { commands: [{ action: 'toggle' }], hidden: true });
});

test('parses protocol URLs', () => {
  assert.deepEqual(parseUrl(`${PROTOCOL}://start?minutes=15`), { action: 'start', minutes: 15 });
  assert.deepEqual(parseUrl(`${PROTOCOL}://stop`), { action: 'stop' });
  assert.equal(parseUrl(`${PROTOCOL}://format-disk`), null);
  assert.equal(parseUrl('https://example.com'), null);
});
