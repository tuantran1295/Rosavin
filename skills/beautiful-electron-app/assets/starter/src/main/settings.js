'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { DURATION_PRESETS } = require('../shared/format');

const isBool = (v) => typeof v === 'boolean';
const oneOf = (...values) => (v) => values.includes(v);

// Every setting: its default and a validator. Unknown keys and invalid values
// are dropped, so a hand-edited or corrupted file can never break the app.
const SCHEMA = {
  language: { default: 'auto', valid: oneOf('auto', 'en', 'vi') },
  theme: { default: 'system', valid: oneOf('system', 'light', 'dark') },
  launchAtLogin: { default: false, valid: isBool },
  showWindowOnLaunch: { default: true, valid: isBool },
  defaultDuration: { default: 0, valid: (v) => DURATION_PRESETS.includes(v) },
  exampleOption: { default: true, valid: isBool },
  showCountdown: { default: true, valid: isBool },
  notifyWhenFinished: { default: true, valid: isBool },
  clickAction: { default: 'toggle', valid: oneOf('toggle', 'menu') },
};

const DEFAULTS = Object.freeze(Object.fromEntries(Object.entries(SCHEMA).map(([k, s]) => [k, s.default])));

/** JSON settings store with validation and atomic writes (temp file + rename). */
class Settings extends EventEmitter {
  constructor(file) {
    super();
    this.file = file;
    /** True until the file has been written once (first launch). */
    this.isFirstRun = !fs.existsSync(file);
    this.values = { ...DEFAULTS, ...this.#load() };
  }

  #load() {
    try {
      return Settings.sanitize(JSON.parse(fs.readFileSync(this.file, 'utf8')));
    } catch {
      return {};
    }
  }

  static sanitize(patch) {
    const clean = {};
    if (!patch || typeof patch !== 'object') return clean;
    for (const [key, value] of Object.entries(patch)) {
      if (SCHEMA[key] && SCHEMA[key].valid(value)) clean[key] = value;
    }
    return clean;
  }

  get(key) {
    return this.values[key];
  }

  getAll() {
    return { ...this.values };
  }

  /** Applies a partial update; returns the keys that actually changed. */
  set(patch) {
    const clean = Settings.sanitize(patch);
    const changed = Object.keys(clean).filter((k) => this.values[k] !== clean[k]);
    if (!changed.length) return [];
    Object.assign(this.values, clean);
    this.#save();
    this.emit('change', changed, this.getAll());
    return changed;
  }

  persist() {
    this.#save();
  }

  #save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.values, null, 2));
      fs.renameSync(tmp, this.file);
      this.isFirstRun = false;
    } catch (err) {
      console.error('[settings] could not save', err);
    }
  }
}

module.exports = { Settings, DEFAULTS, SCHEMA };
