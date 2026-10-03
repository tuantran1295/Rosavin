'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgv, parseUrl } = require('../src/main/commands');

test('parses activation flags', () => {
  assert.deepEqual(parseArgv(['/Applications/Rosavin.app/Contents/MacOS/Rosavin', '--activate=30']).commands, [{ action: 'activate', minutes: 30 }]);
  assert.deepEqual(parseArgv(['rosavin', '--activate']).commands, [{ action: 'activate' }]);
  assert.deepEqual(parseArgv(['rosavin', '--activate=abc']).commands, [{ action: 'activate' }]);
  assert.deepEqual(parseArgv(['rosavin', '--activate=99999']).commands, [{ action: 'activate' }]);
});

test('parses other actions and --hidden', () => {
  const { commands, hidden } = parseArgv(['rosavin', '--deactivate', '--toggle', '--show', '--hidden']);
  assert.deepEqual(commands, [{ action: 'deactivate' }, { action: 'toggle' }, { action: 'show' }]);
  assert.equal(hidden, true);
});

test('ignores Electron / Chromium switches and paths', () => {
  const { commands, hidden } = parseArgv(['/usr/bin/electron', '.', '--inspect=0', '--remote-debugging-port=0', '--no-sandbox']);
  assert.deepEqual(commands, []);
  assert.equal(hidden, false);
});

test('parses rosavin:// URLs', () => {
  assert.deepEqual(parseUrl('rosavin://activate?minutes=15'), { action: 'activate', minutes: 15 });
  assert.deepEqual(parseUrl('rosavin://activate'), { action: 'activate' });
  assert.deepEqual(parseUrl('rosavin://deactivate'), { action: 'deactivate' });
  assert.deepEqual(parseUrl('rosavin:toggle'), { action: 'toggle' });
  assert.deepEqual(parseUrl('ROSAVIN://Benefits'), { action: 'benefits' });
  assert.deepEqual(parseArgv(['Rosavin.exe', 'rosavin://preferences']).commands, [{ action: 'preferences' }]);
});

test('rejects unknown URLs', () => {
  assert.equal(parseUrl('rosavin://format-disk'), null);
  assert.equal(parseUrl('https://example.com/activate'), null);
  assert.equal(parseUrl('not a url'), null);
});
