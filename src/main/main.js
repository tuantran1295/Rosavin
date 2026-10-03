'use strict';

const path = require('node:path');
const {
  app,
  ipcMain,
  Menu,
  nativeTheme,
  Notification,
  powerMonitor,
  powerSaveBlocker,
  shell,
} = require('electron');

const { Settings } = require('./settings');
const { KeepAwake } = require('./keep-awake');
const { TrayController } = require('./tray');
const { createMainWindow, isSafeExternalUrl, backgroundColor } = require('./windows');
const { buildAppMenu } = require('./app-menu');
const { resolveLocale, getDictionary, t, SUPPORTED } = require('./i18n');
const { PROTOCOL, parseArgv, parseUrl } = require('./commands');
const { DURATION_PRESETS, QUICK_DURATIONS, formatDuration } = require('../shared/time');
const { IMAGES, SOURCES } = require('../shared/content');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// Lets tests and developers run with a throwaway profile.
if (process.env.ROSAVIN_USER_DATA) app.setPath('userData', process.env.ROSAVIN_USER_DATA);
if (isWindows) app.setAppUserModelId('com.rosavin.app');

let settings = null;
let keepAwake = null;
let trayController = null;
let mainWindow = null;
let locale = 'en';
let dict = getDictionary('en');
const pendingCommands = [];

// ---------------------------------------------------------------------------
// Single instance: a second launch forwards its arguments to the running app.
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const { commands } = parseArgv(argv);
    if (commands.length) commands.forEach(runCommand);
    else showWindow();
  });

  // macOS delivers rosavin:// links here, possibly before the app is ready.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    const command = parseUrl(url);
    if (!command) return;
    if (app.isReady() && keepAwake) runCommand(command);
    else pendingCommands.push(command);
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (e) => e.preventDefault());
  });

  // Closing the window keeps Rosavin running in the menu bar / tray.
  app.on('window-all-closed', () => {});
  app.on('activate', () => showWindow());
  app.on('will-quit', () => {
    keepAwake?.dispose();
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

  keepAwake = new KeepAwake({ powerSaveBlocker });
  keepAwake.on('change', onStateChange);
  keepAwake.on('finished', onFinished);
  settings.on('change', onSettingsChange);

  trayController = new TrayController({
    keepAwake,
    settings,
    getDictionary: () => dict,
    actions: { toggle, activate, setKeepScreenOn, showWindow, quit },
  });
  trayController.create();

  registerIpc();
  if (settings.isFirstRun) {
    // First launch: apply the defaults (start at login is on) and remember them.
    applyLoginItem(settings.get('launchAtLogin'));
    settings.persist();
  } else {
    syncLoginItem();
  }

  powerMonitor.on('resume', () => keepAwake.check());
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBackgroundColor(backgroundColor());
  });

  if (process.env.ROSAVIN_E2E === '1') {
    // Test hooks for scripts/e2e.mjs and scripts/screenshots.mjs (never set in normal use).
    global.__rosavin = { keepAwake, settings, trayController, getWindow: () => mainWindow, showWindow, activate, deactivate };
  }

  const { commands, hidden } = parseArgv(process.argv);
  if (settings.get('activateOnLaunch')) activate();
  [...pendingCommands.splice(0), ...commands].forEach(runCommand);

  const shouldShow = !commands.length && !hidden && !wasOpenedAtLogin() && settings.get('showWindowOnLaunch');
  if (shouldShow) showWindow();
  else if (!mainWindow) setDockVisible(false);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function activate(minutes = settings.get('defaultDuration')) {
  return keepAwake.start({ minutes, keepScreenOn: settings.get('keepScreenOn') });
}

function deactivate() {
  return keepAwake.stop();
}

function toggle() {
  return keepAwake.active ? deactivate() : activate();
}

function setKeepScreenOn(value) {
  settings.set({ keepScreenOn: Boolean(value) });
}

function quit() {
  app.quit();
}

function runCommand(command) {
  switch (command.action) {
    case 'activate':
      activate(command.minutes ?? settings.get('defaultDuration'));
      break;
    case 'deactivate':
      deactivate();
      break;
    case 'toggle':
      toggle();
      break;
    case 'show':
      showWindow();
      break;
    case 'benefits':
    case 'preferences':
      showWindow(command.action);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Window & dock
// ---------------------------------------------------------------------------
function showWindow(view = 'home') {
  setDockVisible(true);
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (view !== 'home') mainWindow.webContents.send('rosavin:navigate', view);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (isMac) app.focus({ steal: true });
    return mainWindow;
  }

  mainWindow = createMainWindow({ view });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isMac) app.focus({ steal: true });
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    setDockVisible(false);
    showTrayHintOnce();
  });
  return mainWindow;
}

// macOS: show a Dock icon + app menu only while the window is open; otherwise
// Rosavin is a pure menu bar app (LSUIElement is set in the bundle).
function setDockVisible(visible) {
  if (!isMac) return;
  if (visible) {
    app.setActivationPolicy('regular');
    Menu.setApplicationMenu(buildAppMenu(dict, { showWindow, quit }));
  } else {
    app.setActivationPolicy('accessory');
  }
}

function showTrayHintOnce() {
  if (settings.get('trayHintShown') || !Notification.isSupported()) return;
  settings.set({ trayHintShown: true });
  new Notification({
    title: t(dict, 'notifications.stillRunningTitle'),
    body: t(dict, isMac ? 'notifications.stillRunningMac' : 'notifications.stillRunningWin'),
    silent: true,
  }).show();
}

// ---------------------------------------------------------------------------
// State, settings & locale
// ---------------------------------------------------------------------------
function onStateChange(state) {
  trayController?.refresh();
  send('rosavin:state', state);
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
  if (changed.includes('keepScreenOn')) keepAwake.setKeepScreenOn(values.keepScreenOn);
  if (changed.includes('launchAtLogin')) applyLoginItem(values.launchAtLogin);
  trayController?.invalidate();
  send('rosavin:settings', { settings: values, locale, strings: dict });
}

function updateLocale() {
  const system = [...(app.getPreferredSystemLanguages?.() ?? []), app.getLocale()];
  locale = resolveLocale(settings.get('language'), system);
  dict = getDictionary(locale);
}

// ---------------------------------------------------------------------------
// Start at login
// ---------------------------------------------------------------------------
const LOGIN_ARGS = isWindows ? ['--hidden'] : [];

function applyLoginItem(enabled) {
  // Never register the development Electron binary as a login item.
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: enabled, args: LOGIN_ARGS });
}

function syncLoginItem() {
  if (!app.isPackaged) return;
  try {
    const { openAtLogin } = app.getLoginItemSettings({ args: LOGIN_ARGS });
    // The OS is the source of truth (the user may have removed the item there).
    if (openAtLogin !== settings.get('launchAtLogin')) settings.set({ launchAtLogin: openAtLogin });
  } catch (err) {
    console.error('[login-item] could not read state', err);
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

// ---------------------------------------------------------------------------
// IPC (renderer ↔ main). Every handler checks that the call comes from our UI.
// ---------------------------------------------------------------------------
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
  handle('rosavin:get-snapshot', () => snapshot());
  handle('rosavin:toggle', () => toggle());
  handle('rosavin:activate', (minutes) => {
    if (!DURATION_PRESETS.includes(minutes)) throw new Error('Invalid duration');
    return activate(minutes);
  });
  handle('rosavin:deactivate', () => deactivate());
  handle('rosavin:update-settings', (patch) => {
    settings.set(patch);
    return settings.getAll();
  });
  handle('rosavin:open-external', (url) => {
    if (isSafeExternalUrl(url)) return shell.openExternal(url);
    return undefined;
  });
  handle('rosavin:close-window', () => mainWindow?.close());
  handle('rosavin:quit', () => quit());
}

function snapshot() {
  return {
    state: keepAwake.getState(),
    settings: settings.getAll(),
    locale,
    strings: dict,
    languages: SUPPORTED.map((code) => ({ code, name: getDictionary(code).name })),
    platform: process.platform,
    version: app.getVersion(),
    versions: { electron: process.versions.electron, chrome: process.versions.chrome },
    durations: { presets: DURATION_PRESETS, quick: QUICK_DURATIONS },
    images: IMAGES,
    sources: SOURCES,
  };
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
