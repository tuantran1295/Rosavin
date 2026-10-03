'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Settings, DEFAULTS } = require('../src/main/settings');

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rosavin-settings-')), 'settings.json');

test('starts with defaults', () => {
  const settings = new Settings(tempFile());
  assert.deepEqual(settings.getAll(), { ...DEFAULTS });
});

test('persists valid changes and reports changed keys', () => {
  const file = tempFile();
  const settings = new Settings(file);
  const events = [];
  settings.on('change', (keys) => events.push(keys));
  assert.deepEqual(settings.set({ language: 'vi', defaultDuration: 30, keepScreenOn: true }), ['language', 'defaultDuration']);
  assert.deepEqual(events, [['language', 'defaultDuration']]);
  const reloaded = new Settings(file);
  assert.equal(reloaded.get('language'), 'vi');
  assert.equal(reloaded.get('defaultDuration'), 30);
});

test('ignores invalid values and unknown keys', () => {
  const settings = new Settings(tempFile());
  assert.deepEqual(settings.set({ language: 'klingon', defaultDuration: 7, evil: true, theme: 42 }), []);
  assert.equal(settings.get('language'), 'auto');
  assert.equal(settings.get('evil'), undefined);
});

test('recovers from a corrupted file', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{ not json');
  const settings = new Settings(file);
  assert.deepEqual(settings.getAll(), { ...DEFAULTS });
});

test('starts at login by default and knows when it is the first launch', () => {
  const file = tempFile();
  const settings = new Settings(file);
  assert.equal(settings.get('launchAtLogin'), true);
  assert.equal(settings.get('showWindowOnLaunch'), true);
  assert.equal(settings.get('defaultDuration'), 0);
  assert.equal(settings.isFirstRun, true);
  settings.persist();
  assert.equal(settings.isFirstRun, false);
  assert.equal(new Settings(file).isFirstRun, false);
});
