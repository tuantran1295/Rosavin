# Testing and screenshots

How to prove the app works (including its real effect on the OS) and how to look at it systematically.

## Contents
1. Unit tests
2. End-to-end tests with Playwright
3. Verifying real OS effects
4. Screenshots as visual QA
5. When something can't be captured

## 1. Unit tests

- `node:test` + `node:assert/strict`, no extra framework. Run with `node --test "test/*.test.js"`; passing the folder (`node --test test/`) fails because Node treats it as a module path.
- Keep main-process logic in plain modules that don't import `electron` (`session.js`, `settings.js`, `commands.js`, `format.js`) so they test in plain Node.
- Timers: `t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 })`, then `t.mock.timers.tick(ms)`. To simulate a missed timer (computer asleep), jump the clock without firing timers using `t.mock.timers.setTime(Date.now() + ms)` and call `check()`. Inject `now: () => Date.now()` after enabling the mock: a default parameter captures the real `Date.now` too early.
- Inject OS effects as fakes (`new Session({ effects: { start, stop } })`) and assert they're called exactly once per transition.
- Settings: temp files from `fs.mkdtempSync`, covering defaults, persistence, invalid values, unknown keys and corrupted JSON.
- Locales: the parity test walks `en` against every other locale and flags missing keys, array-length differences and translated identifiers.

## 2. End-to-end tests with Playwright

`scripts/e2e.mjs` uses `playwright-core`'s Electron driver. No browsers are downloaded; it drives the app's own Electron.

```js
import { _electron as electron } from 'playwright-core';
const app = await electron.launch({ args: [root], env: { ...process.env, APP_E2E: '1', APP_USER_DATA: tmpDir }, colorScheme: 'light' });
const win = await app.firstWindow();
await win.waitForSelector('body.is-ready');
const state = await app.evaluate(() => global.__app.session.getState());   // main-process access
```

- Packaged app: `electron.launch({ executablePath: '<App>.app/Contents/MacOS/<App>', args: [] })`. Playwright needs the `EnableNodeCliInspectArguments` fuse (on by default; don't flip it if you test packaged builds this way).
- `APP_E2E=1` exposes `global.__app` (session, settings, tray, showWindow…); `APP_USER_DATA` points to a throwaway profile written before launch (language, notifications off).
- Second-instance forwarding: spawn the same executable with the same `APP_USER_DATA` and flags (`--start=15`), then wait for the state to change. The single-instance lock is keyed on userData.
- Tray: `app.evaluate(() => global.__app.trayController.buildMenu().items.map(i => i.label))` checks labels and check marks. `tray.emit('click', { metaKey: false, … })` simulates a click. `tray.getTitle()` returns the countdown on macOS.
- Collect `pageerror` and `console.error` from every window and fail the run on any.
- Wait on conditions (`waitFor(async () => (await state()).active)`), never on fixed sleeps.
- Closing the last window must keep the app alive: assert `BrowserWindow.getAllWindows().length === 0` and that the tray still exists, then reopen with `showWindow()` and `app.waitForEvent('window')`.
- Playwright clicks go through DevTools, not the OS. They bypass window drag regions and native menus, so one real click on each dialog's close button belongs in the manual pass.

## 3. Verifying real OS effects

UI state isn't proof. Add a check for whatever the feature actually does:

| Feature | Command | Expect |
| --- | --- | --- |
| Keep awake (macOS) | `pmset -g assertions` | `pid <PID>(<App>): … NoDisplaySleepAssertion` (or `NoIdleSleepAssertion` in system-only mode); gone after stop/quit |
| Keep awake (Windows) | `powercfg /requests` (admin) | the exe under DISPLAY / SYSTEM |
| Login item (macOS) | `app.getLoginItemSettings()` in `app.evaluate` | `openAtLogin: true` (packaged builds only; avoid on a user's own machine unless asked) |
| URL scheme | `open "<protocol>://start?minutes=5"` against a normally launched packaged app | state changes |
| Files / network | read the file, `curl` the port | expected content |

The PID is `app.process().pid` for both the dev and the packaged executable.

## 4. Screenshots as visual QA

`npm run screenshots` (macOS) drives each language through every important screen and writes framed JPEGs to `docs/images/screenshots/<lang>/`:

- `01-main-off`, `02-main-on` (a session with simulated elapsed time so the ring is partly drawn), `03-menu`, `04-learn-*` (every tab), `05-preferences`, `06-about`, `07-main-on-dark`.
- Window captures come from `page.screenshot()` at device scale (2× on Retina), then get wrapped by resvg in macOS chrome: rounded corners, traffic lights (the green one grey for non-resizable windows), a hairline border and a soft shadow on a backdrop, saved as JPEG through `sips` (about 7 MB for ~30 images instead of ~60 MB of PNGs).
- Pass `colorScheme: 'dark'` to `electron.launch` for dark captures. Playwright otherwise forces light regardless of the app's theme.
- To show a running timer, start a session and shift `startedAt`/`endsAt` back through `global.__app.session.current`, then emit `change`.

Review every image (open them; don't just count files). Typical finds: a label wrapping in one language, a dialog under the traffic lights, low contrast in dark mode, a toggle hint that looks like a placeholder.

## 5. When something can't be captured

Without Screen Recording permission (common for agents and CI), macOS blocks capturing other windows, native menus and Finder. The starter therefore:

- renders the tray menu from `trayController.buildMenu()` data in a macOS-style HTML replica (real labels, check marks, shortcuts, submenu opened to the left near the screen edge), screenshotted with Playwright;
- for the installer, compose an illustration the same way from `build/background@2x.png`, the app icon and the icon positions in `electron-builder.yml`.

Say so when you hand over such images, and offer to replace them with real captures if the user grants permission (System Settings › Privacy & Security › Screen Recording). Don't trigger permission prompts on the user's machine without asking. A capability check: compile a three-line C program that prints `CGPreflightScreenCaptureAccess()`.
