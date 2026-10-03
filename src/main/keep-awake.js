'use strict';

const { EventEmitter } = require('node:events');

// Electron maps these to native APIs:
//   macOS   → IOPMAssertion (PreventUserIdleDisplaySleep / PreventUserIdleSystemSleep)
//   Windows → PowerCreateRequest / SetThreadExecutionState (display / system required)
const BLOCKER_TYPE = {
  display: 'prevent-display-sleep', // keeps screen on, no dimming, no screen saver, no sleep
  system: 'prevent-app-suspension', // keeps the computer running, the display may sleep
};

// setTimeout can't wait longer than ~24.8 days.
const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * Owns the power-save blocker and the optional countdown.
 *
 * Emits:
 *   'change' (state)                       whenever the state changes
 *   'finished' ({ durationMinutes })       when a timed session runs out
 */
class KeepAwake extends EventEmitter {
  /**
   * @param {object} deps
   * @param {Electron.PowerSaveBlocker} deps.powerSaveBlocker
   * @param {() => number} [deps.now]
   */
  constructor({ powerSaveBlocker, now = Date.now }) {
    super();
    this.blocker = powerSaveBlocker;
    this.now = now;
    this.blockerId = null;
    this.timer = null;
    this.session = null; // { startedAt, endsAt, durationMinutes, keepScreenOn }
  }

  get active() {
    return this.session !== null;
  }

  getState() {
    if (!this.session) {
      return { active: false, keepScreenOn: null, startedAt: null, endsAt: null, durationMinutes: null, remainingMs: null, blockerRunning: false };
    }
    const { startedAt, endsAt, durationMinutes, keepScreenOn } = this.session;
    return {
      active: true,
      keepScreenOn,
      startedAt,
      endsAt,
      durationMinutes,
      remainingMs: endsAt ? Math.max(0, endsAt - this.now()) : null,
      blockerRunning: this.blockerId !== null && this.blocker.isStarted(this.blockerId),
    };
  }

  /**
   * Start (or restart) a session.
   * @param {{ minutes?: number, keepScreenOn?: boolean }} options  minutes = 0 → indefinitely
   */
  start({ minutes = 0, keepScreenOn = true } = {}) {
    const startedAt = this.now();
    const endsAt = minutes > 0 ? startedAt + minutes * 60_000 : null;
    this.#applyBlocker(keepScreenOn);
    this.session = { startedAt, endsAt, durationMinutes: minutes, keepScreenOn };
    this.#schedule();
    this.#emit();
    return this.getState();
  }

  stop() {
    if (!this.session) return this.getState();
    this.#clearTimer();
    this.#releaseBlocker();
    this.session = null;
    this.#emit();
    return this.getState();
  }

  toggle(options) {
    return this.active ? this.stop() : this.start(options);
  }

  /** Switch between "keep screen on" and "system only" without ending the session. */
  setKeepScreenOn(keepScreenOn) {
    if (!this.session || this.session.keepScreenOn === keepScreenOn) return this.getState();
    this.#applyBlocker(keepScreenOn);
    this.session.keepScreenOn = keepScreenOn;
    this.#emit();
    return this.getState();
  }

  /** Re-check the deadline, e.g. after the computer wakes up from a forced sleep. */
  check() {
    if (this.session?.endsAt && this.now() >= this.session.endsAt) {
      this.#finish();
    } else {
      this.#schedule();
    }
  }

  dispose() {
    this.#clearTimer();
    this.#releaseBlocker();
    this.session = null;
  }

  #applyBlocker(keepScreenOn) {
    const type = keepScreenOn ? BLOCKER_TYPE.display : BLOCKER_TYPE.system;
    const previous = this.blockerId;
    // Start the new blocker before releasing the old one so there is no gap.
    this.blockerId = this.blocker.start(type);
    if (previous !== null && this.blocker.isStarted(previous)) this.blocker.stop(previous);
  }

  #releaseBlocker() {
    if (this.blockerId !== null && this.blocker.isStarted(this.blockerId)) {
      this.blocker.stop(this.blockerId);
    }
    this.blockerId = null;
  }

  #schedule() {
    this.#clearTimer();
    if (!this.session?.endsAt) return;
    const delay = Math.min(Math.max(0, this.session.endsAt - this.now()), MAX_TIMER_MS);
    this.timer = setTimeout(() => this.check(), delay);
  }

  #clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  #finish() {
    const { durationMinutes } = this.session;
    this.stop();
    this.emit('finished', { durationMinutes });
  }

  #emit() {
    this.emit('change', this.getState());
  }
}

module.exports = { KeepAwake, BLOCKER_TYPE };
