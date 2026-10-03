'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { DURATION_PRESETS } = require('../shared/time');

const DEFAULTS = Object.freeze({
  language: 'auto', // 'auto' | 'en' | 'vi'
  theme: 'system', // 'system' | 'light' | 'dark'
  launchAtLogin: false,
  activateOnLaunch: false,
  showWindowOnLaunch: true,
  defaultDuration: 0, // minutes, 0 = indefinitely
  keepScreenOn: true, // false = only keep the system awake, let the display sleep
  showCountdown: true, // remaining time next to the menu bar icon (macOS)
  notifyWhenFinished: true,
  clickAction: 'toggle', // 'toggle' | 'menu'
  trayHintShown: false,
});

const VALIDATORS = {
  language: (v) => ['auto', 'en', 'vi'].includes(v),
  theme: (v) => ['system', 'light', 'dark'].includes(v),
  launchAtLogin: (v) => typeof v === 'boolean',
  activateOnLaunch: (v) => typeof v === 'boolean',
  showWindowOnLaunch: (v) => typeof v === 'boolean',
  defaultDuration: (v) => DURATION_PRESETS.includes(v),
  keepScreenOn: (v) => typeof v === 'boolean',
  showCountdown: (v) => typeof v === 'boolean',
  notifyWhenFinished: (v) => typeof v === 'boolean',
  clickAction: (v) => ['toggle', 'menu'].includes(v),
  trayHintShown: (v) => typeof v === 'boolean',
};

/**
 * Small JSON-file settings store. Unknown keys and invalid values are dropped,
 * writes are atomic (temp file + rename) so a crash can't corrupt the file.
 */
class Settings extends EventEmitter {
  constructor(file) {
    super();
    this.file = file;
    this.values = { ...DEFAULTS, ...this.#load() };
  }

  #load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return Settings.sanitize(raw);
    } catch {
      return {};
    }
  }

  static sanitize(patch) {
    const clean = {};
    if (!patch || typeof patch !== 'object') return clean;
    for (const [key, value] of Object.entries(patch)) {
      if (VALIDATORS[key] && VALIDATORS[key](value)) clean[key] = value;
    }
    return clean;
  }

  get(key) {
    return this.values[key];
  }

  getAll() {
    return { ...this.values };
  }

  /** Applies a partial update. Returns the list of keys that actually changed. */
  set(patch) {
    const clean = Settings.sanitize(patch);
    const changed = Object.keys(clean).filter((k) => this.values[k] !== clean[k]);
    if (!changed.length) return [];
    Object.assign(this.values, clean);
    this.#save();
    this.emit('change', changed, this.getAll());
    return changed;
  }

  #save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.values, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[settings] could not save', err);
    }
  }
}

module.exports = { Settings, DEFAULTS };
