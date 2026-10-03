'use strict';

const { app, Menu } = require('electron');
const { t } = require('./i18n');

/**
 * The macOS application menu, shown while the window is open.
 * Windows has no menu bar (the window removes it).
 */
function buildAppMenu(dict, { showWindow, quit }) {
  if (process.platform !== 'darwin') return null;
  return Menu.buildFromTemplate([
    {
      label: app.getName(),
      submenu: [
        { label: t(dict, 'appMenu.about'), click: () => showWindow('about') },
        { type: 'separator' },
        { label: t(dict, 'appMenu.preferences'), accelerator: 'Cmd+,', click: () => showWindow('preferences') },
        { type: 'separator' },
        { label: t(dict, 'appMenu.hide'), role: 'hide' },
        { label: t(dict, 'appMenu.hideOthers'), role: 'hideOthers' },
        { label: t(dict, 'appMenu.showAll'), role: 'unhide' },
        { type: 'separator' },
        { label: t(dict, 'appMenu.quit'), accelerator: 'Cmd+Q', click: () => quit() },
      ],
    },
    {
      label: t(dict, 'appMenu.edit'),
      submenu: [
        { label: t(dict, 'appMenu.undo'), role: 'undo' },
        { label: t(dict, 'appMenu.redo'), role: 'redo' },
        { type: 'separator' },
        { label: t(dict, 'appMenu.cut'), role: 'cut' },
        { label: t(dict, 'appMenu.copy'), role: 'copy' },
        { label: t(dict, 'appMenu.paste'), role: 'paste' },
        { label: t(dict, 'appMenu.selectAll'), role: 'selectAll' },
      ],
    },
    {
      label: t(dict, 'appMenu.window'),
      role: 'windowMenu',
      submenu: [
        { label: t(dict, 'appMenu.minimize'), role: 'minimize' },
        { label: t(dict, 'appMenu.close'), role: 'close' },
      ],
    },
    {
      label: t(dict, 'appMenu.help'),
      role: 'help',
      submenu: [{ label: t(dict, 'appMenu.learn'), click: () => showWindow('learn') }],
    },
  ]);
}

module.exports = { buildAppMenu };
