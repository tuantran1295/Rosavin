'use strict';

const path = require('node:path');
const { BrowserWindow, shell, nativeTheme } = require('electron');

const isMac = process.platform === 'darwin';
const RENDERER_INDEX = path.join(__dirname, '..', 'renderer', 'index.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');
const WINDOW_ICON = path.join(__dirname, '..', 'assets', 'icon.png');

const SIZE = { width: 980, height: 680 };
const VIEWS = new Set(['home', 'benefits', 'preferences', 'about']);

function isSafeExternalUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function backgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#0B1D17' : '#FBF6EC';
}

/**
 * Creates the main window. The renderer is sandboxed, has no Node access and
 * talks to the main process only through the small API in preload.js.
 */
function createMainWindow({ view = 'home', title = 'Rosavin' } = {}) {
  const win = new BrowserWindow({
    ...SIZE,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title,
    backgroundColor: backgroundColor(),
    icon: isMac ? undefined : WINDOW_ICON,
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 20 } }
      : { autoHideMenuBar: true }),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });

  if (!isMac) win.removeMenu();

  // Never navigate away from the bundled UI; open web links in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) shell.openExternal(url);
    }
  });

  win.loadFile(RENDERER_INDEX, { query: { view: VIEWS.has(view) ? view : 'home' } });
  return win;
}

module.exports = { createMainWindow, isSafeExternalUrl, backgroundColor, VIEWS, SIZE, RENDERER_INDEX };
