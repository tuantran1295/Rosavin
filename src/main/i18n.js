'use strict';

const { template } = require('../shared/time');

const DICTIONARIES = {
  en: require('../shared/locales/en'),
  vi: require('../shared/locales/vi'),
};

const SUPPORTED = Object.keys(DICTIONARIES);

/**
 * Resolve the UI language.
 * @param {string} preference  'auto' | 'en' | 'vi'
 * @param {string[]} systemLanguages  e.g. app.getPreferredSystemLanguages()
 */
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
