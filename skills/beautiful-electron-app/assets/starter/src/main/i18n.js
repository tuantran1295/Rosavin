'use strict';

const { template } = require('../shared/format');

// Add a language: create src/shared/locales/<code>.js with exactly the same
// shape as en.js (test/i18n.test.js enforces it) and list it here.
const DICTIONARIES = {
  en: require('../shared/locales/en'),
  vi: require('../shared/locales/vi'),
};

const SUPPORTED = Object.keys(DICTIONARIES);

function resolveLocale(preference, systemLanguages = []) {
  if (SUPPORTED.includes(preference)) return preference;
  for (const tag of systemLanguages) {
    const base = String(tag).toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED.includes(base)) return base;
  }
  return 'en';
}

function getDictionary(code) {
  return DICTIONARIES[code] || DICTIONARIES.en;
}

/** t(dict, 'tray.turnOn', { n: 5 }) */
function t(dict, key, vars) {
  const value = key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
  if (typeof value !== 'string') return key;
  return vars ? template(value, vars) : value;
}

module.exports = { resolveLocale, getDictionary, t, SUPPORTED };
