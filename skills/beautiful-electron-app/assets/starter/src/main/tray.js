'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Tray, Menu, nativeImage } = require('electron');
const { DURATION_PRESETS, formatDuration, formatRemaining } = require('../shared/format');
const { t } = require('./i18n');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const trayDir = path.join(__dirname, '..', 'assets', 'tray');

function loadIcon(on) {
  // macOS: "…Template" images (black + alpha) are tinted for light/dark menu
  // bars; @2x/@3x siblings load automatically. Windows/Linux: coloured icons.
  const file = isMac
    ? path.join(trayDir, on ? 'trayOnTemplate.png' : 'trayOffTemplate.png')
    : path.join(trayDir, `tray-win-${on ? 'on' : 'off'}.${isWindows ? 'ico' : 'png'}`);
  if (!fs.existsSync(file)) console.warn(`[tray] missing ${file}; run "npm run assets"`);
  const image = nativeImage.createFromPath(file);
  if (isMac) image.setTemplateImage(true);
  return image;
}

class TrayController {
  constructor({ session, settings, getDictionary, actions }) {
    this.session = session;
    this.settings = settings;
    this.getDictionary = getDictionary;
    this.actions = actions; // toggle(), start(minutes), showWindow(view?), quit()
    this.tray = null;
    this.ticker = null;
    this.icons = { on: loadIcon(true), off: loadIcon(false) };
    this.last = { title: null, tooltip: null, active: null };
  }

  create() {
    this.tray = new Tray(this.icons.off);
    if (isMac) this.tray.setIgnoreDoubleClickEvents(true);
    if (process.platform === 'linux') {
      this.tray.setContextMenu(this.buildMenu());
    } else {
      // Click toggles; right-click / ⌘-click / ctrl-click opens the menu.
      // (setContextMenu on macOS would make every click open the menu.)
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
    this.tray?.popUpContextMenu(this.buildMenu());
  }

  /** Icon, countdown title (macOS) and tooltip; cheap enough to call every second. */
  refresh() {
    if (!this.tray || this.tray.isDestroyed()) return;
    const dict = this.getDictionary();
    const state = this.session.getState();
    if (this.last.active !== state.active) {
      this.tray.setImage(state.active ? this.icons.on : this.icons.off);
      this.last.active = state.active;
    }
    let tooltip;
    let title = '';
    if (!state.active) tooltip = t(dict, 'tray.tooltipOff');
    else if (state.endsAt) {
      tooltip = t(dict, 'tray.tooltipOnTimed', { remaining: formatRemaining(state.remainingMs, dict, 'long') });
      if (this.settings.get('showCountdown')) title = formatRemaining(state.remainingMs, dict, 'compact');
    } else tooltip = t(dict, 'tray.tooltipOn');

    if (isMac && title !== this.last.title) {
      // monospacedDigit stops the menu bar item from jiggling every second.
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

  invalidate() {
    this.last = { title: null, tooltip: null, active: null };
    this.refresh();
  }

  #updateTicker(state) {
    const needsTicker = state.active && Boolean(state.endsAt);
    if (needsTicker && !this.ticker) this.ticker = setInterval(() => this.refresh(), 1000);
    else if (!needsTicker && this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  /** Rebuilt on every open so labels, check marks and the countdown are current. */
  buildMenu() {
    const dict = this.getDictionary();
    const state = this.session.getState();
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
          // Checkboxes, not radios: an Electron radio group always forces one item on.
          type: 'checkbox',
          checked: state.active && state.durationMinutes === minutes,
          click: () => this.actions.start(minutes),
        })),
      },
      { type: 'separator' },
      { id: 'open', label: t(dict, 'tray.openWindow'), click: () => this.actions.showWindow() },
      { id: 'learn', label: t(dict, 'tray.learn'), click: () => this.actions.showWindow('learn') },
      { id: 'preferences', label: t(dict, 'tray.preferences'), accelerator: 'CmdOrCtrl+,', click: () => this.actions.showWindow('preferences') },
      { type: 'separator' },
      { id: 'about', label: t(dict, 'tray.about'), click: () => this.actions.showWindow('about') },
      { id: 'quit', label: t(dict, 'tray.quit'), accelerator: 'CmdOrCtrl+Q', click: () => this.actions.quit() },
    ]);
  }

  destroy() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    if (this.tray && !this.tray.isDestroyed()) this.tray.destroy();
    this.tray = null;
  }
}

module.exports = { TrayController };
