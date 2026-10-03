'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveLocale, getDictionary, t } = require('../src/main/i18n');
const en = require('../src/shared/locales/en');
const vi = require('../src/shared/locales/vi');

test('resolves the UI language', () => {
  assert.equal(resolveLocale('auto', ['vi-VN', 'en-US']), 'vi');
  assert.equal(resolveLocale('auto', ['en-GB']), 'en');
  assert.equal(resolveLocale('auto', ['fr-FR', 'de']), 'en');
  assert.equal(resolveLocale('vi', ['en-US']), 'vi');
  assert.equal(resolveLocale('auto', []), 'en');
});

test('translates keys with placeholders', () => {
  assert.equal(t(getDictionary('en'), 'tray.turnOn'), 'Turn On');
  assert.equal(t(getDictionary('vi'), 'tray.turnOn'), 'Bật');
  assert.equal(t(getDictionary('en'), 'tray.statusOnTimed', { remaining: '5 min' }), 'Rosavin is on — 5 min left');
  assert.equal(t(getDictionary('en'), 'does.not.exist'), 'does.not.exist');
});

test('English and Vietnamese dictionaries have the same shape', () => {
  const problems = [];
  (function walk(a, b, at) {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) problems.push(`${at}: array length differs`);
      else a.forEach((x, i) => walk(x, b[i], `${at}[${i}]`));
    } else if (a && typeof a === 'object') {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b || {})])) {
        if (!(key in a) || !(key in (b || {}))) problems.push(`${at}.${key} missing`);
        else walk(a[key], b[key], `${at}.${key}`);
      }
    } else if (typeof a !== typeof b) {
      problems.push(`${at}: type differs`);
    } else if (typeof a === 'string' && ['level', 'icon'].some((k) => at.endsWith(`.${k}`)) && a !== b) {
      problems.push(`${at}: must not be translated`);
    }
  })(en, vi, '');
  assert.deepEqual(problems, []);
});
