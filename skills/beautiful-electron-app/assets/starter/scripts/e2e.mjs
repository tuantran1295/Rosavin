#!/usr/bin/env node
// End-to-end smoke test: drives the real Electron app with Playwright.
//
//   npm run test:e2e                                         # development build
//   npm run test:e2e -- --app release/mac-universal/__APP_NAME__.app   # packaged app
//
// Add checks for your feature's real OS effects (e.g. `pmset -g assertions`
// for power assertions, files written, a local server answering…).

import { _electron as electron } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const en = require('../src/shared/locales/en.js');
const vi = require('../src/shared/locales/vi.js');

const argApp = process.argv.indexOf('--app');
const appPath = argApp > -1 ? path.resolve(process.argv[argApp + 1]) : null;
const executablePath = appPath?.endsWith('.app') ? path.join(appPath, 'Contents', 'MacOS', path.basename(appPath, '.app')) : appPath;
const isMac = process.platform === 'darwin';

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'app-e2e-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ language: 'en', notifyWhenFinished: false }));
const env = { ...process.env, APP_E2E: '1', APP_USER_DATA: userData };

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push(true);
    console.log(`  ✔ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    results.push(false);
    console.log(`  ✖ ${name} — ${err.message}`);
  }
}
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, { timeout = 6000, message = 'condition not met' } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(150);
  }
  throw new Error(message);
}

function runSecondInstance(args) {
  const command = executablePath || require('electron');
  const commandArgs = executablePath ? args : [root, ...args];
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, { env, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); resolve('timeout'); }, 20000);
    child.on('exit', (code) => { clearTimeout(timer); resolve(code); });
  });
}

console.log(`\nE2E — ${appPath ? `packaged app: ${appPath}` : 'development build'}\n`);
const app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: [root] }), env, colorScheme: 'light' });
const state = () => app.evaluate(() => global.__app.session.getState());
const errors = [];
let win = await app.firstWindow();
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
};
watch(win);

await check('window renders without errors', async () => {
  await win.waitForSelector('body.is-ready', { timeout: 15000 });
  const title = await win.textContent('#status-title');
  assert(title === en.ui.statusOffTitle, `status "${title}"`);
  assert(!errors.length, errors.join(' | '));
  return `"${title}"`;
});

await check('tray icon exists', async () => {
  const alive = await app.evaluate(() => Boolean(global.__app.trayController.tray) && !global.__app.trayController.tray.isDestroyed());
  assert(alive, 'tray missing');
});

await check('the big button toggles the session', async () => {
  await win.click('#orb');
  await waitFor(async () => (await state()).active, { message: 'did not start' });
  await win.click('#orb');
  await waitFor(async () => !(await state()).active, { message: 'did not stop' });
});

await check('a duration chip starts a timed session with a countdown', async () => {
  await win.click('.chip[data-minutes="30"]');
  const s = await waitFor(async () => { const st = await state(); return st.durationMinutes === 30 ? st : null; });
  const title = isMac ? await app.evaluate(() => global.__app.trayController.tray.getTitle()) : '';
  if (isMac) assert(/30m/.test(title), `tray title "${title}"`);
  return `${Math.round((s.endsAt - Date.now()) / 60000)} min, tray "${title.trim()}"`;
});

await check('tray menu reflects the session', async () => {
  const items = await app.evaluate(() => global.__app.trayController.buildMenu().items.map((i) => ({ id: i.id, label: i.label })));
  const toggle = items.find((i) => i.id === 'toggle');
  assert(toggle.label === en.tray.turnOff, `toggle "${toggle.label}"`);
});

await check('timed sessions end automatically', async () => {
  await app.evaluate(() => global.__app.session.start({ minutes: 0.05 }));
  await waitFor(async () => !(await state()).active, { timeout: 8000, message: 'timer did not fire' });
});

await check('a second launch forwards --start / --stop', async () => {
  await runSecondInstance(['--start=15']);
  await waitFor(async () => (await state()).durationMinutes === 15, { timeout: 15000, message: '--start not applied' });
  await runSecondInstance(['--stop']);
  await waitFor(async () => !(await state()).active, { timeout: 15000, message: '--stop not applied' });
});

await check('Vietnamese updates the UI and the menu', async () => {
  await app.evaluate(() => global.__app.settings.set({ language: 'vi' }));
  await waitFor(async () => (await win.textContent('#status-title')) === vi.ui.statusOffTitle, { message: 'UI not translated' });
  const labels = await app.evaluate(() => global.__app.trayController.buildMenu().items.map((i) => i.label));
  assert(labels.includes(vi.tray.turnOn), labels.join(', '));
  await app.evaluate(() => global.__app.settings.set({ language: 'en' }));
});

await check('learn modal opens and images load', async () => {
  await app.evaluate(() => global.__app.showWindow('learn'));
  await win.waitForSelector('#learn-modal:not([hidden])');
  await win.click('#tab-gallery');
  await win.waitForFunction(() => [...document.querySelectorAll('#panel-gallery img')].every((img) => img.complete && img.naturalWidth > 0));
  await win.keyboard.press('Escape');
  await win.waitForSelector('#learn-modal', { state: 'hidden' });
});

await check('dialog close buttons work (drag regions off while a dialog is open)', async () => {
  for (const [opener, id] of [['#open-prefs', 'prefs-modal'], ['#open-about', 'about-modal'], ['#open-learn', 'learn-modal']]) {
    await win.click(opener);
    await win.waitForSelector(`#${id}:not([hidden])`);
    const regions = await win.evaluate(() => [...document.querySelectorAll('.drag')].map((el) => getComputedStyle(el).webkitAppRegion));
    assert(regions.every((r) => r === 'no-drag'), `${id}: drag regions still active`);
    await win.click(`#${id} .close-button`);
    await win.waitForSelector(`#${id}`, { state: 'hidden' });
  }
});

await check('closing the window keeps the app in the tray', async () => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await waitFor(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length === 0));
  const [page] = await Promise.all([app.waitForEvent('window'), app.evaluate(() => global.__app.showWindow())]);
  win = page;
  watch(win);
  await win.waitForSelector('body.is-ready');
});

await check('quits cleanly', async () => {
  await app.close();
});

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed${errors.length ? ` · renderer errors: ${errors.join(' | ')}` : ''}\n`);
fs.rmSync(userData, { recursive: true, force: true });
process.exit(passed === results.length && !errors.length ? 0 : 1);
