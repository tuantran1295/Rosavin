#!/usr/bin/env node
// End-to-end smoke test: drives the real Electron app and checks that it truly
// keeps the computer awake (via `pmset -g assertions` on macOS).
//
//   npm run test:e2e                                   # development build
//   npm run test:e2e -- --app release/mac-universal/Rosavin.app   # packaged app
//
// Uses Playwright's Electron driver (playwright-core, no browsers needed).

import { _electron as electron } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vi = require('../src/shared/locales/vi.js');
const en = require('../src/shared/locales/en.js');

const argApp = process.argv.indexOf('--app');
const appPath = argApp > -1 ? path.resolve(process.argv[argApp + 1]) : null;
const isMac = process.platform === 'darwin';

function executableFor(app) {
  if (!app) return null;
  if (app.endsWith('.app')) return path.join(app, 'Contents', 'MacOS', path.basename(app, '.app'));
  return app;
}

const executablePath = executableFor(appPath);
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rosavin-e2e-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ language: 'en', trayHintShown: true, notifyWhenFinished: false }));
const env = { ...process.env, ROSAVIN_E2E: '1', ROSAVIN_USER_DATA: userData };

const results = [];
async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? '', ms: Date.now() - started });
    console.log(`  ✔ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    results.push({ name, ok: false, detail: err.message, ms: Date.now() - started });
    console.log(`  ✖ ${name} — ${err.message}`);
  }
}
const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, { timeout = 6000, interval = 150, message = 'condition not met' } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(interval);
  }
  throw new Error(message);
}

function powerAssertions(pid) {
  if (!isMac) return [];
  const out = execFileSync('pmset', ['-g', 'assertions'], { encoding: 'utf8' });
  return out.split('\n').filter((line) => line.includes(`pid ${pid}(`)).map((line) => line.trim());
}
const isDisplayAssertion = (line) => /PreventUserIdleDisplaySleep|NoDisplaySleepAssertion/.test(line);
const isSystemAssertion = (line) => /PreventUserIdleSystemSleep|NoIdleSleepAssertion/.test(line);

function runSecondInstance(args) {
  const command = executablePath || require('electron');
  const commandArgs = executablePath ? args : [root, ...args];
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, { env, stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill();
      resolve('timeout');
    }, 20000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

console.log(`\nRosavin E2E — ${appPath ? `packaged app: ${appPath}` : 'development build'}\n`);

const app = await electron.launch({
  ...(executablePath ? { executablePath, args: [] } : { args: [root] }),
  env,
  colorScheme: 'light',
});
const pid = app.process().pid;
const rendererErrors = [];
const state = () => app.evaluate(() => global.__rosavin.keepAwake.getState());
let win = await app.firstWindow();
const watch = (page) => {
  page.on('pageerror', (e) => rendererErrors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && rendererErrors.push(m.text()));
};
watch(win);

await check('window renders without errors', async () => {
  await win.waitForSelector('body.is-ready', { timeout: 15000 });
  const title = await win.textContent('#status-title');
  assert(title === en.ui.statusOffTitle, `unexpected status "${title}"`);
  assert(rendererErrors.length === 0, rendererErrors.join(' | '));
  return `status "${title}"`;
});

await check('tray icon is created', async () => {
  const info = await app.evaluate(() => {
    const tray = global.__rosavin.trayController.tray;
    return { alive: Boolean(tray) && !tray.isDestroyed(), bounds: tray.getBounds() };
  });
  assert(info.alive, 'tray missing');
  return `bounds ${JSON.stringify(info.bounds)}`;
});

await check('clicking the eye keeps the display awake', async () => {
  await win.click('#orb');
  const s = await waitFor(async () => {
    const st = await state();
    return st.active && st.blockerRunning ? st : null;
  }, { message: 'session did not start' });
  assert(s.keepScreenOn === true && s.endsAt === null, 'expected an indefinite, screen-on session');
  if (isMac) {
    const lines = await waitFor(() => powerAssertions(pid).filter(isDisplayAssertion), { message: 'no display-sleep assertion in pmset' });
    return lines[0];
  }
  return 'blocker running';
});

await check('"Keep screen on" off switches to a system-only assertion', async () => {
  await win.click('label[for="keep-screen-on"] .switch');
  await waitFor(async () => (await state()).keepScreenOn === false, { message: 'mode did not change' });
  if (isMac) {
    const lines = await waitFor(() => {
      const all = powerAssertions(pid);
      return all.some(isSystemAssertion) && !all.some(isDisplayAssertion) ? all : null;
    }, { message: 'expected only a system-sleep assertion' });
    await win.click('label[for="keep-screen-on"] .switch');
    await waitFor(async () => (await state()).keepScreenOn === true);
    return lines.find(isSystemAssertion);
  }
  return 'mode switched';
});

await check('30-minute chip starts a timed session with a menu bar countdown', async () => {
  await win.click('.chip[data-minutes="30"]');
  const s = await waitFor(async () => {
    const st = await state();
    return st.durationMinutes === 30 ? st : null;
  });
  const minutesLeft = (s.endsAt - Date.now()) / 60000;
  assert(minutesLeft > 29 && minutesLeft <= 30, `endsAt is ${minutesLeft.toFixed(2)} min away`);
  const title = isMac ? await app.evaluate(() => global.__rosavin.trayController.tray.getTitle()) : '';
  if (isMac) assert(/30m/.test(title), `tray title "${title}"`);
  const sub = await win.textContent('#status-sub');
  return `title "${title.trim()}", status "${sub}"`;
});

await check('tray menu reflects the session', async () => {
  const menu = await app.evaluate(() => {
    const m = global.__rosavin.trayController.buildMenu();
    return m.items.map((i) => ({ id: i.id, label: i.label, checked: i.checked, sub: i.submenu ? i.submenu.items.map((s) => ({ label: s.label, checked: s.checked })) : null }));
  });
  const byId = Object.fromEntries(menu.filter((i) => i.id).map((i) => [i.id, i]));
  assert(byId.status.label.startsWith('Rosavin is on'), `status "${byId.status.label}"`);
  assert(byId.toggle.label === 'Turn Off', `toggle "${byId.toggle.label}"`);
  assert(byId['turn-on-for'].sub.length === 10, 'expected 10 durations');
  const checked = byId['turn-on-for'].sub.filter((s) => s.checked).map((s) => s.label);
  assert(checked.length === 1 && checked[0] === '30 minutes', `checked: ${checked}`);
  assert(byId['keep-screen-on'].checked === true, 'keep screen on should be checked');
  return `${menu.length} items, "${byId.status.label}"`;
});

await check('clicking the tray icon toggles off and releases the assertion', async () => {
  await app.evaluate(() => global.__rosavin.trayController.tray.emit('click', { metaKey: false, ctrlKey: false, altKey: false, shiftKey: false }));
  await waitFor(async () => !(await state()).active, { message: 'still active' });
  if (isMac) await waitFor(() => powerAssertions(pid).length === 0, { message: 'assertion still held' });
  const title = await win.textContent('#status-title');
  assert(title === en.ui.statusOffTitle, `status "${title}"`);
  return 'released';
});

await check('timed sessions end automatically', async () => {
  await app.evaluate(() => global.__rosavin.keepAwake.start({ minutes: 0.05, keepScreenOn: true })); // 3 seconds
  await waitFor(async () => (await state()).active);
  await waitFor(async () => !(await state()).active, { timeout: 8000, message: 'timer did not fire' });
  if (isMac) await waitFor(() => powerAssertions(pid).length === 0, { message: 'assertion still held' });
  return 'ended after ~3 s';
});

await check('command line: second instance forwards --activate=15 / --deactivate', async () => {
  const code = await runSecondInstance(['--activate=15']);
  const s = await waitFor(async () => {
    const st = await state();
    return st.active && st.durationMinutes === 15 ? st : null;
  }, { timeout: 15000, message: '--activate=15 was not applied' });
  await runSecondInstance(['--deactivate']);
  await waitFor(async () => !(await state()).active, { timeout: 15000, message: '--deactivate was not applied' });
  return `second instance exit code ${code}, session ${s.durationMinutes} min`;
});

await check('Vietnamese language updates the UI and the tray menu', async () => {
  await app.evaluate(() => global.__rosavin.settings.set({ language: 'vi' }));
  await waitFor(async () => (await win.textContent('#status-title')) === vi.ui.statusOffTitle, { message: 'UI not translated' });
  const labels = await app.evaluate(() => global.__rosavin.trayController.buildMenu().items.map((i) => i.label));
  assert(labels.includes(vi.tray.turnOn) && labels.includes(vi.tray.quit), `labels: ${labels.join(', ')}`);
  const button = await win.textContent('#open-benefits');
  await app.evaluate(() => global.__rosavin.settings.set({ language: 'en' }));
  return `"${vi.ui.statusOffTitle}", button "${button.trim()}"`;
});

await check('benefits modal opens with all photos loaded', async () => {
  await app.evaluate(() => global.__rosavin.showWindow('benefits'));
  await win.waitForSelector('#benefits-modal:not([hidden])');
  await win.click('#tab-gallery');
  await win.waitForFunction(() => [...document.querySelectorAll('#panel-gallery img')].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 8000 });
  const count = await win.$$eval('#panel-gallery img', (imgs) => imgs.length);
  await win.click('#tab-sources');
  const sources = await win.$$eval('#panel-sources li', (li) => li.length);
  await win.keyboard.press('Escape');
  await win.waitForSelector('#benefits-modal', { state: 'hidden' });
  assert(count === 6 && sources >= 15, `photos ${count}, sources ${sources}`);
  return `${count} photos, ${sources} sources`;
});

await check('closing the window keeps Rosavin running in the menu bar', async () => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await waitFor(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length === 0));
  await sleep(500);
  const alive = await app.evaluate(() => !global.__rosavin.trayController.tray.isDestroyed());
  assert(alive, 'tray destroyed');
  const [page] = await Promise.all([app.waitForEvent('window'), app.evaluate(() => global.__rosavin.showWindow())]);
  win = page;
  watch(win);
  await win.waitForSelector('body.is-ready');
  return 'window reopened from the tray';
});

await check('quitting releases everything', async () => {
  await app.evaluate(() => global.__rosavin.activate(0));
  await waitFor(async () => (await state()).active);
  await app.close();
  if (isMac) await waitFor(() => powerAssertions(pid).length === 0, { message: 'assertion survived quit' });
  return 'clean exit';
});

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${rendererErrors.length ? ` · renderer errors: ${rendererErrors.join(' | ')}` : ''}\n`);
fs.rmSync(userData, { recursive: true, force: true });
process.exit(failed.length || rendererErrors.length ? 1 : 0);
