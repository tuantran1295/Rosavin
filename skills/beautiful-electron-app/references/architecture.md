# Architecture

The starter's process model, security posture and OS integrations, and how to extend them safely.

## Contents
1. Process model
2. Security checklist
3. Adding a feature end to end
4. Settings
5. Localisation
6. Tray / menu bar
7. Dock, windows and lifecycle
8. Commands: CLI flags and custom protocol
9. Start at login
10. Common OS integrations

## 1. Process model

```
main process (Node)                         renderer (sandboxed Chromium)
  main.js ── Session (feature) ──┐            index.html + styles.css + app.js
           ── Settings (JSON)    │  IPC        window.appApi.*  ──invoke──▶ ipcMain.handle('app:*')
           ── TrayController     ├──────────▶  onState / onSettings / onNavigate ◀── webContents.send
           ── i18n dictionaries  │
  preload.js: contextBridge.exposeInMainWorld('appApi', {...})
  shared/format.js (UMD: require() in main, <script> in renderer)
```

- The main process owns all state and all OS access. The renderer renders a snapshot (`app:get-snapshot`) and reacts to pushed events.
- Locale dictionaries are plain data, so main resolves the language once and sends the whole dictionary to the renderer: one source of truth, no bundler.
- No bundler at all: classic `<script defer>` files in the renderer (ES modules over `file://` are unreliable), CommonJS in main and preload, ESM only in `scripts/*.mjs`.

## 2. Security checklist (keep every item)

- `BrowserWindow` with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`.
- CSP meta tag: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'`. No inline scripts or styles in production HTML.
- `setWindowOpenHandler` → always `deny`; open `https:`/`mailto:` links with `shell.openExternal` after validating the URL.
- `will-navigate` → `preventDefault()` for anything but the current page; `will-attach-webview` → blocked.
- Every IPC handler goes through `handle()`, which checks `event.senderFrame.url` is our `renderer/index.html`, and validates arguments (e.g. durations must be in `DURATION_PRESETS`).
- The preload exposes intent-level functions (`start(minutes)`, `updateSettings(patch)`), never `ipcRenderer` itself or generic "invoke anything" helpers.
- Build the DOM with `textContent` (the `h()` helper). Use `innerHTML` only for static, author-controlled SVG icon strings.
- Bundle every asset. No remote fonts, images or scripts.
- Test hooks are opt-in via environment variables (`APP_E2E=1`, `APP_USER_DATA`) and only expose objects to the main-process global.

## 3. Adding a feature end to end

Example: the feature should keep the computer awake while the session runs.

1. **Main**: wire the effect into the session.
   ```js
   const { powerSaveBlocker } = require('electron');
   let blockerId = null;
   session = new Session({ effects: {
     start: () => { blockerId = powerSaveBlocker.start('prevent-display-sleep'); },
     stop: () => { if (blockerId !== null) powerSaveBlocker.stop(blockerId); blockerId = null; },
   } });
   ```
2. **IPC** (only if the UI needs a new action): add `handle('app:<action>', (arg) => …)` with validation in `registerIpc()`, and a matching function in `preload.js`.
3. **State**: include anything the UI must show in `session.getState()` or `snapshot()`. The existing `change` → `app:state` broadcast does the rest.
4. **UI**: render it in `renderState()`, and add strings to every locale.
5. **Tests**: a unit test for the logic (inject fakes through `effects`), plus an E2E check of the real effect (`pmset -g assertions` shows `NoDisplaySleepAssertion` for the app's PID).

Keep OS-specific code behind small functions that check `process.platform`, and degrade gracefully where an API doesn't exist.

## 4. Settings

`src/main/settings.js` defines a `SCHEMA` of `{ default, valid }` per key:

```js
const SCHEMA = {
  theme: { default: 'system', valid: oneOf('system', 'light', 'dark') },
  launchAtLogin: { default: false, valid: isBool },
  // add yours here
};
```

- Unknown keys and invalid values are dropped on load and on `set()`, so a corrupted or hand-edited file can't crash the app.
- Writes are atomic (temp file + rename). `isFirstRun` is true until the file has been written once: use it to apply first-launch defaults to the OS (e.g. register the login item) and then `persist()`.
- `set()` emits `change(keys, values)`. `main.js` reacts (theme → `nativeTheme.themeSource`, language → re-resolve the dictionary and rebuild menus, login item → OS) and pushes `app:settings` to the UI.
- In the UI, preference rows bind with `data-setting="<key>"`. `renderSettings()` syncs values without rebuilding the DOM, so focus isn't lost while the user is clicking.

## 5. Localisation

- `src/main/i18n.js` lists dictionaries. `resolveLocale(preference, app.getPreferredSystemLanguages())` honours an explicit choice, then the system languages, then English.
- Add a language: copy `en.js` to `<code>.js`, translate the values (never the keys or identifiers), register it in `i18n.js`, add its Chromium locale to `electronLanguages` in `electron-builder.yml`, and run `npm test` (the parity test lists anything missing).
- Menus (tray and app menu) are rebuilt from the dictionary, so a language switch updates them immediately (`trayController.invalidate()`).

## 6. Tray / menu bar

- macOS: template images (`trayOnTemplate.png` + `@2x` + `@3x`, black + alpha). `setTemplateImage(true)` lets macOS tint them for light and dark menu bars. Windows: coloured `.ico` with 16–64 px entries.
- Click toggles; right-click (and ⌘/ctrl-click) calls `tray.popUpContextMenu(buildMenu())`. Don't use `setContextMenu` on macOS, because it hijacks the left click. Linux trays do need `setContextMenu`.
- `setIgnoreDoubleClickEvents(true)` (macOS) so fast clicks toggle reliably.
- Rebuild the menu on every open so status text, check marks and labels are current. Use checkbox items for the current duration: radio groups always force one item on.
- Countdown: `tray.setTitle(' 38m', { fontType: 'monospacedDigit' })`, refreshed by a 1 s ticker only while a timed session runs. Windows shows it in the tooltip instead.
- If the tray isn't wanted, remove `TrayController`, remove `LSUIElement` from `electron-builder.yml`, and quit on `window-all-closed` (except on macOS).

## 7. Dock, windows and lifecycle

- Menu bar apps set `LSUIElement: true` (no Dock icon at launch) and switch `app.setActivationPolicy('regular')` while the window is open (Dock icon + app menu), back to `'accessory'` when it closes.
- Closing the window destroys it (frees memory), and the app keeps running in the tray. Re-opening the app (Finder `activate`, or a second launch on Windows) shows the window again.
- `requestSingleInstanceLock()`: a second launch forwards its argv through `second-instance`. The lock is keyed on the userData path.
- `powerMonitor.on('resume')` → `session.check()`, so deadlines that passed while the computer slept are honoured.
- `nativeTheme.on('updated')` → update the window background colour, which avoids a flash on theme change.
- Notifications use `new Notification({ title, body })` after `Notification.isSupported()`. Click → show the window.

## 8. Commands: CLI flags and custom protocol

- `commands.js` parses `--start[=minutes] --stop --toggle --show --learn --preferences --hidden` and `<protocol>://start?minutes=30` style links, ignoring Chromium switches such as `--inspect`.
- Packaged builds register the scheme (`protocols` in `electron-builder.yml` → `CFBundleURLTypes` / NSIS registry) and call `app.setAsDefaultProtocolClient` (never in development).
- macOS delivers links through `open-url`, possibly before `ready`, so queue them in `pendingCommands`.
- Document the commands in the README, because they're how power users automate the app (macOS Shortcuts "Open URLs", scripts).

## 9. Start at login

- `app.setLoginItemSettings({ openAtLogin, args })`. On macOS 13+ this uses SMAppService (the user may need to approve it in System Settings › General › Login Items). On Windows pass `args: ['--hidden']` so login launches stay quiet.
- On startup, mirror the OS state back into settings (`syncLoginItem`), because the user may have removed the item in System Settings.
- Never register the development Electron binary (`if (!app.isPackaged) return`).
- `app.getLoginItemSettings().wasOpenedAtLogin` (macOS) lets a login launch skip showing the window.
- Turning start-at-login on by default is a product decision: ask the user. macOS shows a "Background item added" notification when it's registered.

## 10. Common OS integrations

| Need | API | Verify with |
| --- | --- | --- |
| Keep awake | `powerSaveBlocker.start('prevent-display-sleep' \| 'prevent-app-suspension')` | `pmset -g assertions` (macOS), `powercfg /requests` (Windows) |
| Global shortcut | `globalShortcut.register('CommandOrControl+Shift+K', fn)`; unregister on quit | press it while another app is focused |
| Idle time | `powerMonitor.getSystemIdleTime()` | log values |
| Battery | `powerMonitor.on('on-battery' / 'on-ac')`, `isOnBatteryPower()` | unplug the charger |
| Open files/folders | `shell.openPath`, `dialog.showOpenDialog` | manual |
| Auto-update | electron-updater + a publish provider (needs signing) | staged release |
| Clipboard | `clipboard.readText/writeText` (main) | manual |
