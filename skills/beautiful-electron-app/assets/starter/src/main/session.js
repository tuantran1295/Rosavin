'use strict';

const { EventEmitter } = require('node:events');

// setTimeout can't wait longer than ~24.8 days.
const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * The app's core on/off feature with an optional countdown. This starter only
 * tracks state; plug the real work in through `effects` (e.g. Electron's
 * powerSaveBlocker, starting a server, blocking notifications…).
 *
 * Emits 'change' (state) and 'finished' ({ durationMinutes }).
 */
class Session extends EventEmitter {
  /**
   * @param {object} [deps]
   * @param {{ start?: () => void, stop?: () => void }} [deps.effects]
   * @param {() => number} [deps.now]
   */
  constructor({ effects = {}, now = Date.now } = {}) {
    super();
    this.effects = effects;
    this.now = now;
    this.timer = null;
    this.current = null; // { startedAt, endsAt, durationMinutes }
  }

  get active() {
    return this.current !== null;
  }

  getState() {
    if (!this.current) return { active: false, startedAt: null, endsAt: null, durationMinutes: null, remainingMs: null };
    const { startedAt, endsAt, durationMinutes } = this.current;
    return { active: true, startedAt, endsAt, durationMinutes, remainingMs: endsAt ? Math.max(0, endsAt - this.now()) : null };
  }

  /** minutes = 0 → until stopped */
  start({ minutes = 0 } = {}) {
    const startedAt = this.now();
    if (!this.current) this.effects.start?.();
    this.current = { startedAt, endsAt: minutes > 0 ? startedAt + minutes * 60_000 : null, durationMinutes: minutes };
    this.#schedule();
    this.emit('change', this.getState());
    return this.getState();
  }

  stop() {
    if (!this.current) return this.getState();
    this.#clearTimer();
    this.effects.stop?.();
    this.current = null;
    this.emit('change', this.getState());
    return this.getState();
  }

  toggle(options) {
    return this.active ? this.stop() : this.start(options);
  }

  /** Re-check the deadline (e.g. after the computer wakes from sleep). */
  check() {
    if (this.current?.endsAt && this.now() >= this.current.endsAt) {
      const { durationMinutes } = this.current;
      this.stop();
      this.emit('finished', { durationMinutes });
    } else {
      this.#schedule();
    }
  }

  dispose() {
    this.#clearTimer();
    if (this.current) this.effects.stop?.();
    this.current = null;
  }

  #schedule() {
    this.#clearTimer();
    if (!this.current?.endsAt) return;
    const delay = Math.min(Math.max(0, this.current.endsAt - this.now()), MAX_TIMER_MS);
    this.timer = setTimeout(() => this.check(), delay);
  }

  #clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

module.exports = { Session };
