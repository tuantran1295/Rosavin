'use strict';

const path = require('node:path');
const { app, ipcMain, Menu, nativeTheme, Notification, powerMonitor, shell } = require('electron');

const { Settings } = require('./settings');
const { Session } = require('./session');
const { TrayController } = require('./tray');
const { createMainWindow, isSafeExternalUrl, backgroundColor } = require('./windows');
const { buildAppMenu } = require('./app-menu');
const { resolveLocale, getDictionary, t, SUPPORTED } = require('./i18n');
const { PROTOCOL, parseArgv, parseUrl } = require('./commands');
const { DURATION_PRESETS, QUICK_DURATIONS, formatDuration } = require('../shared/format');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// Test/dev hooks: a throwaway profile and (in scripts/e2e.mjs) state access.
if (process.env.APP_USER_DATA) app.setPath('userData', process.env.APP_USER_DATA);
if (isWindows) app.setAppUserModelId('__APP_ID__');

let settings = null;
let session = null;
let trayController = null;
let mainWindow = null;
let locale = 'en';
let dict = getDictionary('en');
const pendingCommands = [];

// Single instance: a second launch forwards its arguments to the running app.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const { commands } = parseArgv(argv);
    if (commands.length) commands.forEach(runCommand);
    else showWindow();
  });
  // macOS delivers custom-protocol links here, possibly before `ready`.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    const command = parseUrl(url);
    if (!command) return;
    if (app.isReady() && session) runCommand(command);
    else pendingCommands.push(command);
  });
  app.on('web-contents-created', (_event, contents) => contents.on('will-attach-webview', (e) => e.preventDefault()));
  app.on('window-all-closed', () => {}); // keep running in the menu bar / tray
  app.on('activate', () => showWindow());
  app.on('will-quit', () => {
    session?.dispose();
    trayController?.destroy();
  });
  app.whenReady().then(onReady);
}

function onReady() {
  if (app.isPackaged) app.setAsDefaultProtocolClient(PROTOCOL);
  if (!isMac) Menu.setApplicationMenu(null);
  if (isMac && !app.isPackaged) app.dock?.setIcon(path.join(__dirname, '..', 'assets', 'icon.png'));

  settings = new Settings(path.join(app.getPath('userData'), 'settings.json'));
  nativeTheme.themeSource = settings.get('theme');
  updateLocale();

  // Plug the real feature in here, e.g. { start: () => id = powerSaveBlocker.start(...), stop: () => powerSaveBlocker.stop(id) }.
  session = new Session({ effects: {} });
  session.on('change', onStateChange);
  session.on('finished', onFinished);
  settings.on('change', onSettingsChange);

  trayController = new TrayController({ session, settings, getDictionary: () => dict, actions: { toggle, start, showWindow, quit } });
  trayController.create();

  registerIpc();
  if (settings.isFirstRun) {
    applyLoginItem(settings.get('launchAtLogin'));
    settings.persist();
  } else {
    syncLoginItem();
  }

  powerMonitor.on('resume', () => session.check());
  nativeTheme.on('updated', () => mainWindow && !mainWindow.isDestroyed() && mainWindow.setBackgroundColor(backgroundColor()));

  if (process.env.APP_E2E === '1') {
    global.__app = { session, settings, trayController, getWindow: () => mainWindow, showWindow, start, stop };
  }

  const { commands, hidden } = parseArgv(process.argv);
  [...pendingCommands.splice(0), ...commands].forEach(runCommand);
  const shouldShow = !commands.length && !hidden && !wasOpenedAtLogin() && settings.get('showWindowOnLaunch');
  if (shouldShow) showWindow();
  else if (!mainWindow) setDockVisible(false);
}

// --------------------------------------------------------------------- actions
const start = (minutes = settings.get('defaultDuration')) => session.start({ minutes });
const stop = () => session.stop();
const toggle = () => (session.active ? stop() : start());
const quit = () => app.quit();

function runCommand(command) {
  if (command.action === 'start') start(command.minutes ?? settings.get('defaultDuration'));
  else if (command.action === 'stop') stop();
  else if (command.action === 'toggle') toggle();
  else if (command.action === 'show') showWindow();
  else if (command.action === 'learn' || command.action === 'preferences') showWindow(command.action);
}

// ------------------------------------------------------------- window & dock
function showWindow(view = 'home') {
  setDockVisible(true);
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (view !== 'home') mainWindow.webContents.send('app:navigate', view);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (isMac) app.focus({ steal: true });
    return mainWindow;
  }
  mainWindow = createMainWindow({ view, title: app.getName() });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isMac) app.focus({ steal: true });
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    setDockVisible(false);
  });
  return mainWindow;
}

// macOS: Dock icon + app menu only while the window is open (LSUIElement=true in the bundle).
function setDockVisible(visible) {
  if (!isMac) return;
  if (visible) {
    app.setActivationPolicy('regular');
    Menu.setApplicationMenu(buildAppMenu(dict, { showWindow, quit }));
  } else {
    app.setActivationPolicy('accessory');
  }
}

// ------------------------------------------------------ state, settings, i18n
function onStateChange(state) {
  trayController?.refresh();
  send('app:state', state);
}

function onFinished({ durationMinutes }) {
  if (!settings.get('notifyWhenFinished') || !Notification.isSupported()) return;
  const notification = new Notification({
    title: t(dict, 'notifications.finishedTitle'),
    body: t(dict, 'notifications.finishedBody', { duration: formatDuration(durationMinutes, dict) }),
  });
  notification.on('click', () => showWindow());
  notification.show();
}

function onSettingsChange(changed, values) {
  if (changed.includes('language')) {
    updateLocale();
    if (mainWindow && isMac) Menu.setApplicationMenu(buildAppMenu(dict, { showWindow, quit }));
  }
  if (changed.includes('theme')) nativeTheme.themeSource = values.theme;
  if (changed.includes('launchAtLogin')) applyLoginItem(values.launchAtLogin);
  trayController?.invalidate();
  send('app:settings', { settings: values, locale, strings: dict });
}

function updateLocale() {
  const system = [...(app.getPreferredSystemLanguages?.() ?? []), app.getLocale()];
  locale = resolveLocale(settings.get('language'), system);
  dict = getDictionary(locale);
}

// ------------------------------------------------------------ start at login
const LOGIN_ARGS = isWindows ? ['--hidden'] : [];

function applyLoginItem(enabled) {
  if (!app.isPackaged) return; // never register the dev Electron binary
  app.setLoginItemSettings({ openAtLogin: enabled, args: LOGIN_ARGS });
}

function syncLoginItem() {
  if (!app.isPackaged) return;
  try {
    const { openAtLogin } = app.getLoginItemSettings({ args: LOGIN_ARGS });
    if (openAtLogin !== settings.get('launchAtLogin')) settings.set({ launchAtLogin: openAtLogin });
  } catch (err) {
    console.error('[login-item]', err);
  }
}

function wasOpenedAtLogin() {
  if (!isMac || !app.isPackaged) return false;
  try {
    return app.getLoginItemSettings().wasOpenedAtLogin === true;
  } catch {
    return false;
  }
}

// ------------------------------------------- IPC (validated, UI → main only)
function isTrustedSender(event) {
  try {
    const url = new URL(event.senderFrame.url);
    return url.protocol === 'file:' && decodeURIComponent(url.pathname).endsWith('/renderer/index.html');
  } catch {
    return false;
  }
}

function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) throw new Error(`Blocked IPC call to ${channel}`);
    return fn(...args);
  });
}

function registerIpc() {
  handle('app:get-snapshot', () => snapshot());
  handle('app:toggle', () => toggle());
  handle('app:start', (minutes) => {
    if (!DURATION_PRESETS.includes(minutes)) throw new Error('Invalid duration');
    return start(minutes);
  });
  handle('app:stop', () => stop());
  handle('app:update-settings', (patch) => {
    settings.set(patch);
    return settings.getAll();
  });
  handle('app:open-external', (url) => (isSafeExternalUrl(url) ? shell.openExternal(url) : undefined));
  handle('app:close-window', () => mainWindow?.close());
  handle('app:quit', () => quit());
}

function snapshot() {
  return {
    appName: app.getName(),
    state: session.getState(),
    settings: settings.getAll(),
    locale,
    strings: dict,
    languages: SUPPORTED.map((code) => ({ code, name: getDictionary(code).name })),
    platform: process.platform,
    version: app.getVersion(),
    versions: { electron: process.versions.electron, chrome: process.versions.chrome },
    durations: { presets: DURATION_PRESETS, quick: QUICK_DURATIONS },
  };
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
