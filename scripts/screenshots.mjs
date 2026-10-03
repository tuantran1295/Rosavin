#!/usr/bin/env node
// Generates the screenshots used by README.md and the user guides (macOS only).
//
//   npm run screenshots
//
// Window images are real captures of the running app (Playwright drives it,
// no Screen Recording permission needed). macOS draws the menu bar menu
// natively and it cannot be captured without that permission, so the menu
// images are rendered from the app's real menu definition in a macOS-style
// replica. Output: docs/images/screenshots/{en,vi}/*.jpg

import { _electron as electron } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(root, 'docs', 'images', 'screenshots');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rosavin-shots-'));
const LANGS = process.argv.includes('--lang') ? [process.argv[process.argv.indexOf('--lang') + 1]] : ['en', 'vi'];
const WINDOW = { width: 980, height: 680 };

if (process.platform !== 'darwin') {
  console.error('Screenshots are generated on macOS.');
  process.exit(1);
}

// ------------------------------------------------------------------ helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toJpeg(pngPath, jpgPath, width) {
  fs.mkdirSync(path.dirname(jpgPath), { recursive: true });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', '--resampleWidth', String(width), pngPath, '--out', jpgPath], { stdio: 'ignore' });
}

function renderSvg(svg, file) {
  const png = new Resvg(svg, { font: { loadSystemFonts: true }, shapeRendering: 2 }).render().asPng();
  fs.writeFileSync(file, png);
  return file;
}

/** Wraps a raw 2× capture in macOS window chrome on a soft backdrop. */
function frameWindow(rawPng, outJpg, { dark = false, outWidth = 1400 } = {}) {
  const scale = 2;
  const w = WINDOW.width * scale;
  const h = WINDOW.height * scale;
  const pad = 110;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const data = fs.readFileSync(rawPng).toString('base64');
  const backdrop = dark ? ['#1A2E27', '#0B1A15'] : ['#F6EFE2', '#E7DCC6'];
  const cx = pad + 26 * scale;
  const cy = pad + 26 * scale;
  const r = 6 * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${backdrop[0]}"/><stop offset="1" stop-color="${backdrop[1]}"/></linearGradient>
    <clipPath id="clip"><rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${10 * scale}"/></clipPath>
    <filter id="shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="${22 * scale}" stdDeviation="${26 * scale}" flood-color="#000" flood-opacity="${dark ? 0.6 : 0.3}"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${10 * scale}" fill="#000" filter="url(#shadow)"/>
  <g clip-path="url(#clip)"><image x="${pad}" y="${pad}" width="${w}" height="${h}" xlink:href="data:image/png;base64,${data}"/></g>
  <rect x="${pad + 0.5}" y="${pad + 0.5}" width="${w - 1}" height="${h - 1}" rx="${10 * scale}" fill="none" stroke="${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FF5F57" stroke="#E2463F" stroke-width="1.2"/>
  <circle cx="${cx + 20 * scale}" cy="${cy}" r="${r}" fill="#FEBC2E" stroke="#DFA024" stroke-width="1.2"/>
  <circle cx="${cx + 40 * scale}" cy="${cy}" r="${r}" fill="${dark ? '#4A4F4D' : '#D6D6D6'}" stroke="${dark ? '#3C403E' : '#C4C4C4'}" stroke-width="1.2"/>
</svg>`;
  const png = path.join(tmp, `${path.basename(outJpg, '.jpg')}-framed.png`);
  renderSvg(svg, png);
  toJpeg(png, outJpg, outWidth);
}

// ------------------------------------------------- macOS menu replica (HTML)
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function menuSceneHtml({ items, title, trayIconDataUrl, highlightId, clock }) {
  const shortcut = (acc) => (acc ? acc.replace('CmdOrCtrl+', '⌘') : '');
  const row = (item, { highlighted = false } = {}) => {
    if (item.type === 'separator') return '<div class="sep"></div>';
    const cls = ['item', item.enabled === false ? 'disabled' : '', highlighted ? 'hl' : ''].join(' ');
    return `<div class="${cls}"><span class="check">${item.checked ? '✓' : ''}</span><span class="label">${escapeHtml(item.label)}</span>${
      item.submenu ? '<span class="chev">›</span>' : `<span class="key">${escapeHtml(shortcut(item.accelerator))}</span>`
    }</div>`;
  };
  const parent = items.find((i) => i.id === highlightId);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;-webkit-font-smoothing:antialiased}
  .scene{position:relative;width:760px;height:${130 + items.length * 22}px;overflow:hidden;
    background:radial-gradient(120% 140% at 15% 0%,#2F8A69 0%,#145440 38%,#0C2F24 70%),#0C2F24}
  .scene::after{content:'';position:absolute;inset:0;background:radial-gradient(60% 70% at 85% 110%,rgba(246,181,72,.55),rgba(246,181,72,0) 70%)}
  .bar{position:absolute;left:0;right:0;top:0;height:28px;background:rgba(246,246,246,.72);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:0 14px;font-size:13.5px;color:#111;z-index:2}
  .bar .tray{display:flex;align-items:center;gap:3px;height:22px;padding:0 7px;border-radius:5px;background:rgba(0,0,0,.14);font-variant-numeric:tabular-nums;font-weight:500}
  .bar .tray img{width:18px;height:18px}
  .bar .clock{padding:0 4px;font-weight:500}
  .menu,.sub{position:absolute;z-index:3;min-width:250px;padding:5px;border-radius:9px;background:rgba(242,242,242,.97);
    box-shadow:0 0 0 .5px rgba(0,0,0,.22),0 10px 32px rgba(0,0,0,.32);font-size:13.5px;color:#1d1d1f}
  .item{display:flex;align-items:center;height:22px;padding:0 9px 0 4px;border-radius:5px;white-space:nowrap}
  .item .check{width:18px;text-align:center;font-size:12.5px}
  .item .label{flex:1;padding-right:24px}
  .item .key,.item .chev{color:#8a8a8e;font-size:13px}
  .item .chev{font-size:17px;line-height:1}
  .item.disabled{color:#9b9b9f}
  .item.hl{background:#0A64D8;color:#fff}.item.hl .chev,.item.hl .key{color:#fff}
  .sep{height:1px;margin:5px 10px;background:rgba(0,0,0,.11)}
  </style></head><body><div class="scene" id="scene">
  <div class="bar"><div class="tray"><img src="${trayIconDataUrl}" alt="">${escapeHtml(title)}</div><div class="clock">${escapeHtml(clock)}</div></div>
  <div class="menu" id="menu" style="right:118px;top:31px">${items.map((i) => row(i, { highlighted: i.id === highlightId })).join('')}</div>
  ${parent?.submenu ? `<div class="sub" id="sub" style="min-width:170px">${parent.submenu.map((i) => row(i)).join('')}</div>` : ''}
  </div><script>
    // Open the submenu to the left of the highlighted item, as macOS does near the screen edge.
    const menu = document.getElementById('menu'), sub = document.getElementById('sub'), hl = menu.querySelector('.hl');
    if (sub && hl) { sub.style.left = (menu.offsetLeft - sub.offsetWidth + 3) + 'px'; sub.style.top = (menu.offsetTop + hl.offsetTop - 5) + 'px'; }
  </script></body></html>`;
}

function iconStatesHtml({ activeUrl, inactiveUrl, title, labels }) {
  const bar = (dark) => `<div class="row ${dark ? 'dark' : ''}">
      <div class="cell"><div class="bar"><span class="item"><img src="${inactiveUrl}"></span></div><span>${escapeHtml(labels.off)}</span></div>
      <div class="cell"><div class="bar"><span class="item on"><img src="${activeUrl}">${escapeHtml(title)}</span></div><span>${escapeHtml(labels.on)}</span></div>
    </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased}
  .scene{width:620px;padding:22px;background:linear-gradient(180deg,#F6EFE2,#E9DFCB);display:grid;gap:14px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .cell{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12.5px;color:#43574E;font-weight:500}
  .dark .cell{color:#43574E}
  .bar{width:100%;height:34px;border-radius:10px;background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .dark .bar{background:#262626}
  .item{display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:6px;font-size:14px;font-weight:500;color:#111;font-variant-numeric:tabular-nums}
  .item img{width:20px;height:20px}
  .dark .item{color:#f2f2f2}.dark .item img{filter:invert(1)}
  </style></head><body><div class="scene" id="scene">${bar(false)}${bar(true)}</div></body></html>`;
}

// --------------------------------------------------------------- DMG window
function dmgWindowSvg() {
  const scale = 2;
  const w = 660 * scale;
  const h = 400 * scale;
  const titleH = 28 * scale;
  const pad = 90;
  const W = w + pad * 2;
  const H = h + titleH + pad * 2;
  const bg = fs.readFileSync(path.join(root, 'build', 'background@2x.png')).toString('base64');
  const icon = fs.readFileSync(path.join(root, 'build', 'icon.png')).toString('base64');
  const iconSize = 112 * scale;
  const ix = (x) => pad + x * scale - iconSize / 2;
  const iy = (y) => pad + titleH + y * scale - iconSize / 2;
  // A neutral folder glyph standing in for the Applications alias.
  const folder = (x, y) => `<g transform="translate(${ix(x) + 10} ${iy(y) + 34}) scale(${(iconSize - 20) / 100})">
      <path d="M6 14 h30 l8 8 h50 a6 6 0 0 1 6 6 v54 a6 6 0 0 1-6 6 H6 a6 6 0 0 1-6-6 V20 a6 6 0 0 1 6-6 z" fill="#3E9BE0"/>
      <path d="M0 30 h100 v52 a6 6 0 0 1-6 6 H6 a6 6 0 0 1-6-6 z" fill="#62B5F2"/>
      <path d="M50 42 l-14 30 h7 l3-7 h8 l3 7 h7 z M48.5 60 l1.5-4 1.5 4 z" fill="#1F6FB2" opacity="0.65"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D3F33"/><stop offset="1" stop-color="#0D2219"/></linearGradient>
    <clipPath id="win"><rect x="${pad}" y="${pad}" width="${w}" height="${h + titleH}" rx="${10 * scale}"/></clipPath>
    <filter id="sh" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="40" stdDeviation="46" flood-color="#000" flood-opacity="0.55"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bd)"/>
  <rect x="${pad}" y="${pad}" width="${w}" height="${h + titleH}" rx="${10 * scale}" fill="#000" filter="url(#sh)"/>
  <g clip-path="url(#win)">
    <rect x="${pad}" y="${pad}" width="${w}" height="${titleH}" fill="#ECE9E4"/>
    <image x="${pad}" y="${pad + titleH}" width="${w}" height="${h}" xlink:href="data:image/png;base64,${bg}"/>
    <image x="${ix(180)}" y="${iy(196)}" width="${iconSize}" height="${iconSize}" xlink:href="data:image/png;base64,${icon}"/>
    ${folder(480, 196)}
  </g>
  <text x="${pad + w / 2}" y="${pad + 19 * scale}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial" font-weight="600" font-size="${13 * scale}" fill="#3B3B3B">Rosavin 1.0.0</text>
  <circle cx="${pad + 20 * scale}" cy="${pad + 14 * scale}" r="${6 * scale}" fill="#FF5F57"/>
  <circle cx="${pad + 40 * scale}" cy="${pad + 14 * scale}" r="${6 * scale}" fill="#FEBC2E"/>
  <circle cx="${pad + 60 * scale}" cy="${pad + 14 * scale}" r="${6 * scale}" fill="#28C840"/>
  <text x="${pad + 180 * scale}" y="${iy(196) + iconSize + 30}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial" font-size="${13 * scale}" fill="#1E1E1E">Rosavin</text>
  <text x="${pad + 480 * scale}" y="${iy(196) + iconSize + 30}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial" font-size="${13 * scale}" fill="#1E1E1E">Applications</text>
</svg>`;
}

// -------------------------------------------------------------------- main
async function launch({ lang, dark }) {
  const userData = fs.mkdtempSync(path.join(tmp, `profile-${lang}-`));
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ language: lang, theme: dark ? 'dark' : 'light', trayHintShown: true }));
  const app = await electron.launch({
    args: [root],
    env: { ...process.env, ROSAVIN_E2E: '1', ROSAVIN_USER_DATA: userData },
    colorScheme: dark ? 'dark' : 'light',
  });
  const win = await app.firstWindow();
  await win.waitForSelector('body.is-ready');
  await sleep(600);
  return { app, win };
}

async function simulateSession(app, minutes, elapsedMinutes) {
  await app.evaluate(({ }, [m, e]) => {
    const ka = global.__rosavin.keepAwake;
    ka.start({ minutes: m, keepScreenOn: true });
    ka.session.startedAt -= e * 60_000;
    if (ka.session.endsAt) ka.session.endsAt -= e * 60_000;
    ka.check();
    ka.emit('change', ka.getState());
  }, [minutes, elapsedMinutes]);
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
      const w = new BrowserWindow({ width: 820, height: 640, show: true, frame: false, hasShadow: false, x: 40, y: 60, webPreferences: { sandbox: true } });
      w.setIgnoreMouseEvents(true);
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

async function shootLanguage(lang) {
  console.log(`\n${lang.toUpperCase()}`);
  const { app, win } = await launch({ lang, dark: false });

  await capture(win, '01-main-off', lang);
  await simulateSession(app, 60, 22);
  await capture(win, '02-main-on', lang);

  // Menu bar menu, rendered from the real menu definition.
  const menuData = await app.evaluate(() => {
    const serialize = (menu) => menu.items.map((i) => ({
      id: i.id, type: i.type, label: i.label, enabled: i.enabled, checked: i.checked, accelerator: i.accelerator || '',
      submenu: i.submenu ? serialize(i.submenu) : null,
    }));
    const tc = global.__rosavin.trayController;
    return { items: serialize(tc.buildMenu()), title: tc.tray.getTitle().trim() };
  });
  const trayIcon = (n) => `data:image/png;base64,${fs.readFileSync(path.join(root, 'src', 'assets', 'tray', `${n}@3x.png`)).toString('base64')}`;
  await renderHtml(app, menuSceneHtml({ items: menuData.items, title: menuData.title, trayIconDataUrl: trayIcon('trayActiveTemplate'), highlightId: 'turn-on-for', clock: lang === 'vi' ? 'Th 7 09:41' : 'Sat 9:41 AM' }), path.join(outRoot, lang, '03-menu.jpg'));
  console.log(`  ✓ ${lang}/03-menu.jpg`);
  const labels = lang === 'vi' ? { off: 'Tắt — máy ngủ bình thường', on: 'Bật — giữ máy thức (còn 38 phút)' } : { off: 'Off — sleeps normally', on: 'On — keeping awake (38 min left)' };
  await renderHtml(app, iconStatesHtml({ activeUrl: trayIcon('trayActiveTemplate'), inactiveUrl: trayIcon('trayInactiveTemplate'), title: menuData.title, labels }), path.join(outRoot, lang, '04-menubar-icons.jpg'));
  console.log(`  ✓ ${lang}/04-menubar-icons.jpg`);

  await win.click('#open-benefits');
  await sleep(700);
  await capture(win, '05-benefits-overview', lang);
  const tabs = [['benefits', '06-benefits-cards'], ['awake', '07-benefits-awake'], ['safety', '08-benefits-safety'], ['gallery', '09-benefits-gallery'], ['sources', '11-benefits-sources']];
  for (const [tab, name] of tabs) {
    await win.click(`#tab-${tab}`);
    await sleep(700);
    if (tab === 'gallery') {
      await win.waitForFunction(() => [...document.querySelectorAll('#panel-gallery img')].every((i) => i.complete && i.naturalWidth > 0));
      await capture(win, name, lang);
      await win.click('#panel-gallery .photo-button');
      await sleep(800);
      await capture(win, '10-lightbox', lang);
      await win.keyboard.press('Escape');
      await sleep(300);
    } else {
      await capture(win, name, lang);
    }
  }
  await win.keyboard.press('Escape');
  await sleep(300);
  await win.click('#open-prefs');
  await sleep(600);
  await capture(win, '12-preferences', lang);
  await win.keyboard.press('Escape');
  await sleep(300);
  await win.click('#open-about');
  await sleep(600);
  await capture(win, '13-about', lang);
  await app.close();

  // Dark appearance of the main window.
  const dark = await launch({ lang, dark: true });
  await simulateSession(dark.app, 60, 22);
  await capture(dark.win, '14-main-on-dark', lang, { dark: true });
  await dark.app.close();
}

for (const lang of LANGS) await shootLanguage(lang);

const dmgPng = renderSvg(dmgWindowSvg(), path.join(tmp, 'dmg.png'));
toJpeg(dmgPng, path.join(outRoot, 'dmg-installer.jpg'), 1200);
console.log('  ✓ dmg-installer.jpg');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nScreenshots written to ${path.relative(root, outRoot)}/`);
