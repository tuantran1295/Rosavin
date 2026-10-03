'use strict';

const path = require('node:path');
const { BrowserWindow, shell, nativeTheme } = require('electron');

const isMac = process.platform === 'darwin';
const RENDERER_INDEX = path.join(__dirname, '..', 'renderer', 'index.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');
const WINDOW_ICON = path.join(__dirname, '..', 'assets', 'icon.png');

// A fixed-size window lets the layout be designed precisely.
const SIZE = { width: 980, height: 680 };
const VIEWS = new Set(['home', 'learn', 'preferences', 'about']);

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

/** Sandboxed renderer, no Node access; it talks to main only through preload.js. */
function createMainWindow({ view = 'home', title = 'App' } = {}) {
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
    // macOS: content runs under the traffic lights (keep the top-left 90×44 px free).
    ...(isMac ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 20 } } : { autoHideMenuBar: true }),
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

module.exports = { createMainWindow, isSafeExternalUrl, backgroundColor, SIZE };
