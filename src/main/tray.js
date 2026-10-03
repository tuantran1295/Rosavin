'use strict';

const path = require('node:path');
const { Tray, Menu, nativeImage } = require('electron');
const { DURATION_PRESETS, formatDuration, formatRemaining } = require('../shared/time');
const { t } = require('./i18n');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const trayDir = path.join(__dirname, '..', 'assets', 'tray');

function loadIcon(active) {
  if (isMac) {
    // "…Template" images are drawn black + alpha; macOS tints them for light/dark menu bars.
    // The @2x / @3x files next to them are picked up automatically.
    const image = nativeImage.createFromPath(path.join(trayDir, active ? 'trayActiveTemplate.png' : 'trayInactiveTemplate.png'));
    image.setTemplateImage(true);
    return image;
  }
  const name = active ? 'tray-win-active' : 'tray-win-inactive';
  return nativeImage.createFromPath(path.join(trayDir, isWindows ? `${name}.ico` : `${name}.png`));
}

class TrayController {
  /**
   * @param {object} deps
   * @param {import('./keep-awake').KeepAwake} deps.keepAwake
   * @param {import('./settings').Settings} deps.settings
   * @param {() => object} deps.getDictionary
   * @param {object} deps.actions  toggle(), activate(minutes), setKeepScreenOn(bool), showWindow(view?), quit()
   */
  constructor({ keepAwake, settings, getDictionary, actions }) {
    this.keepAwake = keepAwake;
    this.settings = settings;
    this.getDictionary = getDictionary;
    this.actions = actions;
    this.tray = null;
    this.ticker = null;
    this.icons = { active: loadIcon(true), inactive: loadIcon(false) };
    this.last = { title: null, tooltip: null, active: null };
  }

  create() {
    this.tray = new Tray(this.icons.inactive);
    if (isMac) this.tray.setIgnoreDoubleClickEvents(true);

    if (process.platform === 'linux') {
      // Most Linux trays only support a context menu.
      this.tray.setContextMenu(this.buildMenu());
    } else {
      this.tray.on('click', (event) => {
        const wantsMenu = this.settings.get('clickAction') === 'menu' || event.metaKey || event.ctrlKey;
        if (wantsMenu) this.popUpMenu();
        else this.actions.toggle();
      });
      this.tray.on('right-click', () => this.popUpMenu());
    }
    this.refresh();
    return this.tray;
  }

  popUpMenu() {
    if (!this.tray) return;
    this.tray.popUpContextMenu(this.buildMenu());
  }

  /** Update icon, countdown title and tooltip. Cheap enough to call every second. */
  refresh() {
    if (!this.tray || this.tray.isDestroyed()) return;
    const dict = this.getDictionary();
    const state = this.keepAwake.getState();

    if (this.last.active !== state.active) {
      this.tray.setImage(state.active ? this.icons.active : this.icons.inactive);
      this.last.active = state.active;
    }

    let tooltip;
    let title = '';
    if (!state.active) {
      tooltip = t(dict, 'tray.tooltipOff');
    } else if (state.endsAt) {
      tooltip = t(dict, 'tray.tooltipOnTimed', { remaining: formatRemaining(state.remainingMs, dict, 'long') });
      if (this.settings.get('showCountdown')) title = formatRemaining(state.remainingMs, dict, 'compact');
    } else {
      tooltip = t(dict, 'tray.tooltipOn');
    }

    if (isMac && title !== this.last.title) {
      this.tray.setTitle(title ? ` ${title}` : '', { fontType: 'monospacedDigit' });
      this.last.title = title;
    }
    if (tooltip !== this.last.tooltip) {
      this.tray.setToolTip(tooltip);
      this.last.tooltip = tooltip;
    }
    if (process.platform === 'linux') this.tray.setContextMenu(this.buildMenu());

    this.#updateTicker(state);
  }

  /** Forces the menu bar title/tooltip to be recomputed (e.g. after a language change). */
  invalidate() {
    this.last = { title: null, tooltip: null, active: null };
    this.refresh();
  }

  #updateTicker(state) {
    const needsTicker = state.active && Boolean(state.endsAt);
    if (needsTicker && !this.ticker) {
      this.ticker = setInterval(() => this.refresh(), 1000);
    } else if (!needsTicker && this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  buildMenu() {
    const dict = this.getDictionary();
    const state = this.keepAwake.getState();
    const keepScreenOn = this.settings.get('keepScreenOn');

    let status;
    if (!state.active) status = t(dict, 'tray.statusOff');
    else if (state.endsAt) status = t(dict, 'tray.statusOnTimed', { remaining: formatRemaining(state.remainingMs, dict, 'long') });
    else status = t(dict, 'tray.statusOnIndefinite');

    return Menu.buildFromTemplate([
      { id: 'status', label: status, enabled: false },
      { type: 'separator' },
      { id: 'toggle', label: state.active ? t(dict, 'tray.turnOff') : t(dict, 'tray.turnOn'), click: () => this.actions.toggle() },
      {
        id: 'turn-on-for',
        label: t(dict, 'tray.turnOnFor'),
        submenu: DURATION_PRESETS.map((minutes) => ({
          id: `duration-${minutes}`,
          label: formatDuration(minutes, dict),
          // Checkboxes rather than radios: radio groups always force one item on.
          type: 'checkbox',
          checked: state.active && state.durationMinutes === minutes,
          click: () => this.actions.activate(minutes),
        })),
      },
      {
        id: 'keep-screen-on',
        label: t(dict, 'tray.keepScreenOn'),
        type: 'checkbox',
        checked: keepScreenOn,
        click: () => this.actions.setKeepScreenOn(!keepScreenOn),
      },
      { type: 'separator' },
      { id: 'open', label: t(dict, 'tray.openWindow'), click: () => this.actions.showWindow() },
      { id: 'benefits', label: t(dict, 'tray.benefits'), click: () => this.actions.showWindow('benefits') },
      { id: 'preferences', label: t(dict, 'tray.preferences'), accelerator: 'CmdOrCtrl+,', click: () => this.actions.showWindow('preferences') },
      { type: 'separator' },
      { id: 'about', label: t(dict, 'tray.about'), click: () => this.actions.showWindow('about') },
      { id: 'quit', label: t(dict, 'tray.quit'), accelerator: 'CmdOrCtrl+Q', click: () => this.actions.quit() },
    ]);
  }

  getBounds() {
    return this.tray && !this.tray.isDestroyed() ? this.tray.getBounds() : null;
  }

  destroy() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    if (this.tray && !this.tray.isDestroyed()) this.tray.destroy();
    this.tray = null;
  }
}

module.exports = { TrayController };
