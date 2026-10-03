#!/usr/bin/env node
// Renders every raster/brand asset from the SVG sources in assets/brand.
//
//   npm run assets
//
// Sources (assets/brand): icon.svg (app icon, 1024 canvas), mark.svg (+ optional
// mark-light.svg), tray-on/off.svg (macOS template, 36-unit grid),
// tray-win-on/off.svg (Windows tray). Names, tagline, fonts and colours come
// from brand.json.
//
// Outputs: build/icon.{png,icns,ico}, build/background{,@2x}.png (+ .tiff on
// macOS), src/assets/icon.png, src/assets/tray/*, src/renderer/images/brand/*,
// assets/brand/logo-{dark,light}.{svg,png}, docs/images/{logo-*,icon}.png

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);
const brandDir = (f) => p('assets', 'brand', f);
const BRAND = JSON.parse(fs.readFileSync(p('brand.json'), 'utf8'));
const fontFiles = fs.readdirSync(p('src', 'renderer', 'fonts')).filter((f) => f.endsWith('.ttf')).map((f) => p('src', 'renderer', 'fonts', f));

const mkdir = (dir) => fs.mkdirSync(dir, { recursive: true });
const read = (file) => fs.readFileSync(file, 'utf8');

function render(svg, width) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false, fontFiles, defaultFontFamily: 'Be Vietnam Pro' },
  }).render().asPng();
}

function writePng(file, svg, width) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, render(svg, width));
}

// ICO with PNG-compressed entries (Windows Vista+).
function writeIco(file, pngs) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  mkdir(path.dirname(file));
  fs.writeFileSync(file, Buffer.concat([header, ...pngs.map((x) => x.data)]));
}

// Text → outlines, so logos render the same everywhere. opentype.js 2.x emits
// NaN when glyphs are drawn at an offset or serialised with toPathData(), so we
// draw each glyph at (0, 0), shift the points and serialise ourselves.
function textPath(fontFile, text, size, { letterSpacing = 0 } = {}) {
  const buf = fs.readFileSync(p(fontFile));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  const fmt = (v) => String(Math.round(v * 100) / 100);
  let x = 0;
  let minX = Infinity;
  const parts = [];
  glyphs.forEach((glyph, i) => {
    const gp = glyph.getPath(0, 0, size, {}, font);
    for (const c of gp.commands) {
      for (const k of ['x', 'x1', 'x2']) if (k in c) c[k] += x;
      if ('x' in c && c.x < minX) minX = c.x;
    }
    parts.push(gp.commands.map((c) => {
      if (c.type === 'M' || c.type === 'L') return `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
      if (c.type === 'Q') return `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
      if (c.type === 'C') return `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
      return 'Z';
    }).join(''));
    let advance = glyph.advanceWidth * scale;
    if (i < glyphs.length - 1) advance += font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    x += advance + letterSpacing;
  });
  const d = parts.join(' ');
  if (/NaN|Infinity/.test(d)) throw new Error(`Invalid outline for "${text}"`);
  return { d, minX: Number.isFinite(minX) ? minX : 0, width: x - letterSpacing };
}

function viewBoxOf(svg) {
  const m = /viewBox="([-\d.\s]+)"/.exec(svg);
  const [x, y, w, h] = (m ? m[1] : '0 0 100 100').trim().split(/\s+/).map(Number);
  return { x, y, w, h };
}
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

function lockup(variant) {
  const markSvg = read(variant === 'light' && fs.existsSync(brandDir('mark-light.svg')) ? brandDir('mark-light.svg') : brandDir('mark.svg'));
  const vb = viewBoxOf(markSvg);
  const word = textPath(BRAND.wordmarkFont, BRAND.name, 200, { letterSpacing: 2 });
  const tag = textPath(BRAND.taglineFont, BRAND.tagline.toUpperCase(), 44, { letterSpacing: 8 });
  const markH = 290;
  const s = markH / vb.h;
  const markW = vb.w * s;
  const wordX = markW + 46 - word.minX;
  const baseline = markH / 2 + 30;
  const width = wordX + Math.max(word.width, tag.width) + 24;
  const ink = variant === 'light' ? BRAND.colors.ink : BRAND.colors.inkOnDark;
  const accent = variant === 'light' ? BRAND.colors.accent : BRAND.colors.accentOnDark;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${markH + 10}" role="img" aria-label="${BRAND.name}">
  <g transform="scale(${s.toFixed(5)}) translate(${-vb.x} ${-vb.y})">${inner(markSvg)}</g>
  <path transform="translate(${wordX.toFixed(2)} ${baseline.toFixed(2)})" fill="${ink}" d="${word.d}"/>
  <path transform="translate(${(wordX + 4).toFixed(2)} ${(baseline + 76).toFixed(2)})" fill="${accent}" d="${tag.d}"/>
</svg>
`;
}

function dmgBackground() {
  const markSvg = read(fs.existsSync(brandDir('mark-light.svg')) ? brandDir('mark-light.svg') : brandDir('mark.svg'));
  const vb = viewBoxOf(markSvg);
  const word = textPath(BRAND.wordmarkFont, BRAND.name, 44);
  const hint = textPath(BRAND.uiFont, BRAND.dmgText, 15);
  const s = 46 / vb.h;
  const total = vb.w * s + 12 + word.width;
  const startX = (660 - total) / 2;
  const [bg1, bg2] = BRAND.colors.dmgBackground;
  const [a1, a2] = BRAND.colors.dmgArrow;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <radialGradient id="sun" cx="330" cy="196" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD978" stop-opacity="0.35"/><stop offset="1" stop-color="#FFD978" stop-opacity="0"/></radialGradient>
    <linearGradient id="arrow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a1}"/><stop offset="1" stop-color="${a2}"/></linearGradient>
  </defs>
  <rect width="660" height="400" fill="url(#bg)"/>
  <rect width="660" height="400" fill="url(#sun)"/>
  <g transform="translate(${startX.toFixed(2)} 32) scale(${s.toFixed(5)}) translate(${-vb.x} ${-vb.y})">${inner(markSvg)}</g>
  <path transform="translate(${(startX + vb.w * s + 12 - word.minX).toFixed(2)} 74)" fill="${BRAND.colors.ink}" d="${word.d}"/>
  <path d="M262 196 C 300 168 360 168 398 196" fill="none" stroke="url(#arrow)" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 12"/>
  <path d="M388 182 L 402 199 L 381 203" fill="none" stroke="${a2}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path transform="translate(${((660 - hint.width) / 2).toFixed(2)} 340)" fill="${BRAND.colors.ink}" d="${hint.d}"/>
</svg>
`;
}

// ---------------------------------------------------------------------------
const iconSvg = read(brandDir('icon.svg'));
writePng(p('build', 'icon.png'), iconSvg, 1024);
writePng(p('src', 'assets', 'icon.png'), iconSvg, 512);
writePng(p('src', 'renderer', 'images', 'brand', 'icon-256.png'), iconSvg, 256);

const iconset = path.join(os.tmpdir(), `app-${process.pid}.iconset`);
mkdir(iconset);
for (const size of [16, 32, 128, 256, 512]) {
  writePng(path.join(iconset, `icon_${size}x${size}.png`), iconSvg, size);
  writePng(path.join(iconset, `icon_${size}x${size}@2x.png`), iconSvg, size * 2);
}
if (process.platform === 'darwin') execFileSync('iconutil', ['-c', 'icns', iconset, '-o', p('build', 'icon.icns')]);
else console.warn('! iconutil is macOS-only; build/icon.icns not regenerated');
fs.rmSync(iconset, { recursive: true, force: true });
writeIco(p('build', 'icon.ico'), [16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: render(iconSvg, size) })));

const trayDir = p('src', 'assets', 'tray');
for (const [name, file] of [['trayOnTemplate', 'tray-on.svg'], ['trayOffTemplate', 'tray-off.svg']]) {
  const svg = read(brandDir(file));
  writePng(path.join(trayDir, `${name}.png`), svg, 18);
  writePng(path.join(trayDir, `${name}@2x.png`), svg, 36);
  writePng(path.join(trayDir, `${name}@3x.png`), svg, 54);
}
for (const [name, file] of [['tray-win-on', 'tray-win-on.svg'], ['tray-win-off', 'tray-win-off.svg']]) {
  const svg = read(brandDir(file));
  writeIco(path.join(trayDir, `${name}.ico`), [16, 20, 24, 32, 40, 48, 64].map((size) => ({ size, data: render(svg, size) })));
  writePng(path.join(trayDir, `${name}.png`), svg, 32);
}

for (const variant of ['dark', 'light']) {
  const svg = lockup(variant);
  fs.writeFileSync(brandDir(`logo-${variant}.svg`), svg);
  writePng(brandDir(`logo-${variant}.png`), svg, 1600);
  writePng(p('docs', 'images', `logo-${variant}.png`), svg, 1200);
}
writePng(p('docs', 'images', 'icon.png'), iconSvg, 512);

const dmg = dmgBackground();
writePng(p('build', 'background.png'), dmg, 660);
writePng(p('build', 'background@2x.png'), dmg, 1320);
if (process.platform === 'darwin') {
  execFileSync('tiffutil', ['-cathidpicheck', p('build', 'background.png'), p('build', 'background@2x.png'), '-out', p('build', 'background.tiff')], { stdio: 'ignore' });
}
console.log('✓ Brand assets generated');
