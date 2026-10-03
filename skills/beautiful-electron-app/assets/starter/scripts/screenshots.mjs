#!/usr/bin/env node
// Captures README / guide screenshots (macOS): real window captures framed as a
// macOS window on a soft backdrop, plus the menu bar menu rendered from the
// app's real menu definition (native menus can't be captured without Screen
// Recording permission). Also your visual QA loop: run it after every UI change.
//
//   npm run screenshots              # all languages
//   npm run screenshots -- --lang en
//
// Output: docs/images/screenshots/<lang>/*.jpg

import { _electron as electron } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(root, 'docs', 'images', 'screenshots');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'app-shots-'));
const allLangs = fs.readdirSync(path.join(root, 'src', 'shared', 'locales')).map((f) => f.replace('.js', ''));
const LANGS = process.argv.includes('--lang') ? [process.argv[process.argv.indexOf('--lang') + 1]] : allLangs;
const WINDOW = { width: 980, height: 680 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.platform !== 'darwin') {
  console.error('Screenshots are generated on macOS (uses sips).');
  process.exit(1);
}

function toJpeg(png, jpg, width) {
  fs.mkdirSync(path.dirname(jpg), { recursive: true });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', '--resampleWidth', String(width), png, '--out', jpg], { stdio: 'ignore' });
}

function renderSvg(svg, file) {
  fs.writeFileSync(file, new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
  return file;
}

/** Wrap a 2× window capture in macOS chrome (rounded corners, traffic lights, shadow). */
function frameWindow(rawPng, outJpg, { dark = false } = {}) {
  const s = 2;
  const w = WINDOW.width * s;
  const h = WINDOW.height * s;
  const pad = 110;
  const data = fs.readFileSync(rawPng).toString('base64');
  const bg = dark ? ['#1A2E27', '#0B1A15'] : ['#F6EFE2', '#E7DCC6'];
  const cx = pad + 26 * s;
  const cy = pad + 26 * s;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w + pad * 2}" height="${h + pad * 2}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
    <clipPath id="c"><rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${10 * s}"/></clipPath>
    <filter id="sh" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="${22 * s}" stdDeviation="${26 * s}" flood-color="#000" flood-opacity="${dark ? 0.6 : 0.3}"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${10 * s}" fill="#000" filter="url(#sh)"/>
  <g clip-path="url(#c)"><image x="${pad}" y="${pad}" width="${w}" height="${h}" xlink:href="data:image/png;base64,${data}"/></g>
  <rect x="${pad + 0.5}" y="${pad + 0.5}" width="${w - 1}" height="${h - 1}" rx="${10 * s}" fill="none" stroke="${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="${6 * s}" fill="#FF5F57"/><circle cx="${cx + 20 * s}" cy="${cy}" r="${6 * s}" fill="#FEBC2E"/>
  <circle cx="${cx + 40 * s}" cy="${cy}" r="${6 * s}" fill="${dark ? '#4A4F4D' : '#D6D6D6'}"/>
</svg>`;
  toJpeg(renderSvg(svg, path.join(tmp, `${path.basename(outJpg, '.jpg')}-framed.png`)), outJpg, 1400);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function menuSceneHtml({ items, title, iconUrl, highlightId }) {
  const row = (item, hl) => item.type === 'separator' ? '<div class="sep"></div>'
    : `<div class="item ${item.enabled === false ? 'disabled' : ''} ${hl ? 'hl' : ''}"><span class="check">${item.checked ? '✓' : ''}</span><span class="label">${esc(item.label)}</span>${
      item.submenu ? '<span class="chev">›</span>' : `<span class="key">${esc((item.accelerator || '').replace('CmdOrCtrl+', '⌘'))}</span>`}</div>`;
  const parent = items.find((i) => i.id === highlightId);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased}
  .scene{position:relative;width:760px;height:${130 + items.length * 22}px;overflow:hidden;background:radial-gradient(120% 140% at 15% 0%,#2F8A69 0%,#145440 38%,#0C2F24 70%)}
  .bar{position:absolute;inset:0 0 auto 0;height:28px;background:rgba(246,246,246,.72);display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:0 14px;font-size:13.5px;color:#111}
  .tray{display:flex;align-items:center;gap:3px;height:22px;padding:0 7px;border-radius:5px;background:rgba(0,0,0,.14);font-variant-numeric:tabular-nums;font-weight:500}
  .tray img{width:18px;height:18px}
  .menu,.sub{position:absolute;min-width:250px;padding:5px;border-radius:9px;background:rgba(242,242,242,.97);box-shadow:0 0 0 .5px rgba(0,0,0,.22),0 10px 32px rgba(0,0,0,.32);font-size:13.5px;color:#1d1d1f}
  .item{display:flex;align-items:center;height:22px;padding:0 9px 0 4px;border-radius:5px;white-space:nowrap}
  .check{width:18px;text-align:center;font-size:12.5px}.label{flex:1;padding-right:24px}.key,.chev{color:#8a8a8e}.chev{font-size:17px;line-height:1}
  .disabled{color:#9b9b9f}.hl{background:#0A64D8;color:#fff}.hl .chev{color:#fff}.sep{height:1px;margin:5px 10px;background:rgba(0,0,0,.11)}
  </style></head><body><div class="scene" id="scene">
  <div class="bar"><div class="tray"><img src="${iconUrl}" alt="">${esc(title)}</div><div style="padding:0 4px;font-weight:500">9:41</div></div>
  <div class="menu" id="menu" style="right:96px;top:31px">${items.map((i) => row(i, i.id === highlightId)).join('')}</div>
  ${parent?.submenu ? `<div class="sub" id="sub" style="min-width:170px">${parent.submenu.map((i) => row(i)).join('')}</div>` : ''}
  </div><script>
    const m = document.getElementById('menu'), s = document.getElementById('sub'), hl = m.querySelector('.hl');
    if (s && hl) { s.style.left = (m.offsetLeft - s.offsetWidth + 3) + 'px'; s.style.top = (m.offsetTop + hl.offsetTop - 5) + 'px'; }
  </script></body></html>`;
}

async function launch(lang, dark) {
  const userData = fs.mkdtempSync(path.join(tmp, `profile-${lang}-`));
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ language: lang, theme: dark ? 'dark' : 'light' }));
  const app = await electron.launch({ args: [root], env: { ...process.env, APP_E2E: '1', APP_USER_DATA: userData }, colorScheme: dark ? 'dark' : 'light' });
  const win = await app.firstWindow();
  await win.waitForSelector('body.is-ready');
  await sleep(600);
  return { app, win };
}

// Start a session and pretend part of it already elapsed (so the ring is partly drawn).
async function simulateSession(app, minutes, elapsed) {
  await app.evaluate((_electron, [m, e]) => {
    const s = global.__app.session;
    s.start({ minutes: m });
    s.current.startedAt -= e * 60_000;
    s.current.endsAt -= e * 60_000;
    s.check();
    s.emit('change', s.getState());
  }, [minutes, elapsed]);
  await sleep(1300);
}

async function capture(win, name, lang, opts) {
  const raw = path.join(tmp, `${lang}-${name}.png`);
  await win.screenshot({ path: raw });
  frameWindow(raw, path.join(outRoot, lang, `${name}.jpg`), opts);
  console.log(`  ✓ ${lang}/${name}.jpg`);
}

async function renderHtml(app, html, file) {
  const [page] = await Promise.all([
    app.waitForEvent('window'),
    app.evaluate(({ BrowserWindow }, markup) => {
      const w = new BrowserWindow({ width: 820, height: 640, show: true, frame: false, x: 40, y: 60 });
      w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(markup)}`);
      global.__studio = w;
    }, html),
  ]);
  await page.waitForSelector('#scene');
  await sleep(400);
  const el = await page.$('#scene');
  const box = await el.boundingBox();
  const raw = path.join(tmp, `${path.basename(file, '.jpg')}.png`);
  await el.screenshot({ path: raw });
  await app.evaluate(() => global.__studio.destroy());
  toJpeg(raw, file, Math.min(1400, Math.round(box.width * 2)));
}

for (const lang of LANGS) {
  console.log(lang.toUpperCase());
  const { app, win } = await launch(lang, false);
  await capture(win, '01-main-off', lang);
  await simulateSession(app, 60, 22);
  await capture(win, '02-main-on', lang);

  const menu = await app.evaluate(() => {
    const ser = (m) => m.items.map((i) => ({ id: i.id, type: i.type, label: i.label, enabled: i.enabled, checked: i.checked, accelerator: i.accelerator || '', submenu: i.submenu ? ser(i.submenu) : null }));
    const tc = global.__app.trayController;
    return { items: ser(tc.buildMenu()), title: tc.tray.getTitle().trim() };
  });
  const iconUrl = `data:image/png;base64,${fs.readFileSync(path.join(root, 'src', 'assets', 'tray', 'trayOnTemplate@3x.png')).toString('base64')}`;
  await renderHtml(app, menuSceneHtml({ items: menu.items, title: menu.title, iconUrl, highlightId: 'turn-on-for' }), path.join(outRoot, lang, '03-menu.jpg'));
  console.log(`  ✓ ${lang}/03-menu.jpg`);

  await win.click('#open-learn');
  await sleep(700);
  const tabs = await win.$$eval('.tab', (els) => els.map((e) => e.dataset.tab));
  for (const [i, tab] of tabs.entries()) {
    await win.click(`#tab-${tab}`);
    await sleep(600);
    await capture(win, `04-learn-${i + 1}-${tab}`, lang);
  }
  await win.keyboard.press('Escape');
  await sleep(300);
  await win.click('#open-prefs');
  await sleep(600);
  await capture(win, '05-preferences', lang);
  await win.keyboard.press('Escape');
  await sleep(300);
  await win.click('#open-about');
  await sleep(600);
  await capture(win, '06-about', lang);
  await app.close();

  const dark = await launch(lang, true);
  await simulateSession(dark.app, 60, 22);
  await capture(dark.win, '07-main-on-dark', lang, { dark: true });
  await dark.app.close();
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Screenshots written to ${path.relative(root, outRoot)}/`);
