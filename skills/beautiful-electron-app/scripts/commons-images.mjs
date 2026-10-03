#!/usr/bin/env node
// Find, review and download freely licensed images from Wikimedia Commons,
// keeping attribution data for the UI and CREDITS.md. No dependencies (Node 20+).
//
//   node commons-images.mjs list "Category:Rhodiola rosea" [--min 1400] [--search] > candidates.json
//   node commons-images.mjs sheet candidates.json sheet.jpg          # contact sheet (needs ImageMagick)
//   node commons-images.mjs get "File:Example.jpg" ["File:…"] --width 1280 --out src/renderer/images/photos
//
// `list` takes a category, or a search phrase with --search. `get` writes the
// images and appends attribution to <out>/credits.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'AppImageCollector/1.0 (open-source desktop app; attribution lookup)';
const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d|cc by(-sa)?$|no restrictions)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', maxlag: '5', ...params })}`;
  for (let attempt = 0; attempt < 7; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const json = await res.json();
      if (!json.error) { await sleep(1200); return json; }
      if (json.error.code !== 'maxlag') throw new Error(json.error.info);
    }
    const wait = Number(res.headers.get('retry-after')) || 5 * (attempt + 1);
    console.error(`  … HTTP ${res.status}, retrying in ${wait}s`);
    await sleep(wait * 1000);
  }
  throw new Error('Too many retries');
}

async function titlesFor(query, search) {
  const titles = [];
  let cont = {};
  do {
    const params = search
      ? { action: 'query', list: 'search', srsearch: query, srnamespace: '6', srlimit: '50', ...cont }
      : { action: 'query', list: 'categorymembers', cmtitle: query, cmtype: 'file', cmlimit: '500', ...cont };
    const json = await api(params);
    const items = search ? json.query.search : json.query.categorymembers;
    titles.push(...items.map((i) => i.title));
    cont = search ? null : json.continue;
  } while (cont);
  return titles;
}

async function info(titles, width) {
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const json = await api({
      action: 'query', titles: titles.slice(i, i + 20).join('|'), prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata', ...(width ? { iiurlwidth: String(width) } : {}),
    });
    for (const page of Object.values(json.query.pages)) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata || {};
      out.push({
        title: page.title,
        width: ii.width,
        height: ii.height,
        mime: ii.mime,
        license: strip(m.LicenseShortName?.value),
        licenseUrl: strip(m.LicenseUrl?.value),
        author: strip(m.Artist?.value),
        description: strip(m.ImageDescription?.value).slice(0, 200),
        page: ii.descriptionurl?.split('?')[0],
        original: ii.url?.split('?')[0],
        thumb: ii.thumburl?.split('?')[0],
      });
    }
  }
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => { const i = rest.indexOf(`--${name}`); return i > -1 ? rest[i + 1] : fallback; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--') && rest[i - 1] !== '--search'));

if (cmd === 'list') {
  const min = Number(opt('min', 1000));
  const titles = await titlesFor(positional[0], rest.includes('--search'));
  const items = (await info(titles, 330))
    .filter((x) => /image\/(jpeg|png)/.test(x.mime) && Math.min(x.width, x.height) >= min && FREE.test(x.license));
  console.error(`${items.length} freely licensed images ≥ ${min}px (of ${titles.length} files)`);
  process.stdout.write(JSON.stringify(items, null, 2));
} else if (cmd === 'sheet') {
  const items = JSON.parse(fs.readFileSync(positional[0], 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-sheet-'));
  const files = [];
  for (const [i, item] of items.entries()) {
    if (!item.thumb) continue;
    const res = await fetch(item.thumb, { headers: { 'User-Agent': UA } });
    if (!res.ok) continue;
    const file = path.join(dir, `${String(i).padStart(3, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    files.push(file);
    await sleep(500);
  }
  execFileSync('magick', ['montage', '-label', '%t', ...files, '-geometry', '220x165+4+4', '-tile', '8x', '-background', '#222', '-fill', 'white', positional[1]]);
  console.error(`Wrote ${positional[1]} — tile numbers are indexes into ${positional[0]}`);
} else if (cmd === 'get') {
  const width = Number(opt('width', 1280));
  const outDir = opt('out', 'images');
  fs.mkdirSync(outDir, { recursive: true });
  const creditsFile = path.join(outDir, 'credits.json');
  const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8')) : [];
  for (const item of await info(positional, width)) {
    if (!FREE.test(item.license)) { console.error(`  ✗ skipped ${item.title} (licence: ${item.license || 'unknown'})`); continue; }
    const src = item.width > width ? item.thumb : item.original;
    const res = await fetch(src, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.error(`  ✗ ${item.title}: HTTP ${res.status}`); continue; }
    const name = item.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = path.join(outDir, `${name}${path.extname(src).toLowerCase()}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    credits.push({ file: path.basename(file), title: item.title, author: item.author, license: item.license, licenseUrl: item.licenseUrl, source: item.page });
    console.error(`  ✓ ${path.basename(file)} — ${item.author} · ${item.license}`);
    await sleep(800);
  }
  fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 2));
} else {
  console.error('Usage: commons-images.mjs list <Category:… | phrase --search> [--min 1400] | sheet <list.json> <out.jpg> | get <File:…>… [--width 1280] [--out dir]');
  process.exit(1);
}
