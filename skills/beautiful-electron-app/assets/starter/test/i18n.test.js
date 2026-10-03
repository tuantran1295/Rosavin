'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveLocale } = require('../src/main/i18n');

const dir = path.join(__dirname, '..', 'src', 'shared', 'locales');
const locales = Object.fromEntries(fs.readdirSync(dir).map((f) => [f.replace('.js', ''), require(path.join(dir, f))]));
// Identifiers inside content lists (tabs, blocks, items) must stay identical across languages.
const IDENTIFIERS = new Set(['icon', 'type', 'id', 'src', 'tone', 'url', 'license', 'author']);
const isIdentifier = (at) => at.includes('[') && IDENTIFIERS.has(at.split('.').pop());

test('resolves the UI language', () => {
  assert.equal(resolveLocale('auto', ['vi-VN']), 'vi');
  assert.equal(resolveLocale('auto', ['fr-FR']), 'en');
  assert.equal(resolveLocale('vi', ['en-US']), 'vi');
});

for (const [code, dict] of Object.entries(locales)) {
  if (code === 'en') continue;
  test(`${code} has exactly the same shape as en`, () => {
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
      } else if (isIdentifier(at) && a !== b) {
        problems.push(`${at}: identifiers must not be translated`);
      }
    })(locales.en, dict, '');
    assert.deepEqual(problems, []);
  });
}
