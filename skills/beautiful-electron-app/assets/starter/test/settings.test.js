'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Settings, DEFAULTS } = require('../src/main/settings');

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'app-settings-')), 'settings.json');

test('defaults, first run and persistence', () => {
  const file = tempFile();
  const settings = new Settings(file);
  assert.deepEqual(settings.getAll(), { ...DEFAULTS });
  assert.equal(settings.isFirstRun, true);
  assert.deepEqual(settings.set({ language: 'vi', theme: 'dark' }), ['language', 'theme']);
  assert.equal(new Settings(file).get('language'), 'vi');
  assert.equal(new Settings(file).isFirstRun, false);
});

test('invalid values, unknown keys and corrupted files are ignored', () => {
  const file = tempFile();
  const settings = new Settings(file);
  assert.deepEqual(settings.set({ language: 'xx', defaultDuration: 7, evil: true }), []);
  fs.writeFileSync(file, '{ broken');
  assert.deepEqual(new Settings(file).getAll(), { ...DEFAULTS });
});
