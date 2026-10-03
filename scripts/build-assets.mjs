#!/usr/bin/env node
// Generates every raster/brand asset Rosavin needs from the SVG sources in assets/brand.
//
//   npm run assets
//
// Outputs
//   build/icon.png, build/icon.icns, build/icon.ico      app icons for electron-builder
//   build/background.png (+ @2x, .tiff)                    DMG installer background
//   src/assets/tray/*                                      menu bar (template) + Windows tray icons
//   src/assets/icon.png                                    window / notification icon
//   src/renderer/images/brand/*                            logo files used by the UI
//   assets/brand/rosavin-logo*.svg|png                     horizontal lockups (wordmark as outlines)
//   docs/images/logo*.png, docs/images/icon.png            images for README and guides

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);
const brand = (f) => p('assets', 'brand', f);
const fontsDir = p('src', 'renderer', 'fonts');
const fontFiles = fs.readdirSync(fontsDir).filter((f) => f.endsWith('.ttf')).map((f) => path.join(fontsDir, f));

const mkdir = (dir) => fs.mkdirSync(dir, { recursive: true });
const read = (file) => fs.readFileSync(file, 'utf8');

function render(svg, width, height) {
  const fitTo = height ? { mode: 'height', value: height } : { mode: 'width', value: width };
  const resvg = new Resvg(svg, {
    fitTo,
    font: { loadSystemFonts: false, fontFiles, defaultFontFamily: 'Be Vietnam Pro' },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
  });
  return resvg.render().asPng();
}

function writePng(file, svg, width, height) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, render(svg, width, height));
  return file;
}

// ---------------------------------------------------------------------------
// ICO writer (PNG-compressed entries, supported by Windows Vista and later)
// ---------------------------------------------------------------------------
function writeIco(file, pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  mkdir(path.dirname(file));
  fs.writeFileSync(file, Buffer.concat([header, ...pngs.map((x) => x.data)]));
}

// ---------------------------------------------------------------------------
// Wordmark: "Rosavin" set in Fraunces SemiBold, converted to outlines so the
// logo renders identically everywhere (no font dependency).
// ---------------------------------------------------------------------------
// opentype.js 2.x's Path#toPathData() can emit "NaN" for shifted glyphs, so the
// path commands are serialised here instead.
function commandsToPathData(commands) {
  const n = (v) => String(Math.round(v * 100) / 100);
  return commands.map((c) => {
    switch (c.type) {
      case 'M': return `M${n(c.x)} ${n(c.y)}`;
      case 'L': return `L${n(c.x)} ${n(c.y)}`;
      case 'Q': return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      case 'C': return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      case 'Z': return 'Z';
      default: throw new Error(`Unknown path command ${c.type}`);
    }
  }).join('');
}

function textPath(fontFile, text, size, { letterSpacing = 0 } = {}) {
  const buf = fs.readFileSync(fontFile);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let x = 0;
  const parts = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  glyphs.forEach((glyph, i) => {
    const gp = glyph.getPath(0, 0, size, {}, font);
    for (const cmd of gp.commands) {
      for (const k of ['x', 'x1', 'x2']) if (k in cmd) cmd[k] += x;
      for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
        if (!(kx in cmd)) continue;
        if (cmd[kx] < minX) minX = cmd[kx];
        if (cmd[kx] > maxX) maxX = cmd[kx];
        if (cmd[ky] < minY) minY = cmd[ky];
        if (cmd[ky] > maxY) maxY = cmd[ky];
      }
    }
    parts.push(commandsToPathData(gp.commands));
    let advance = glyph.advanceWidth * scale;
    if (i < glyphs.length - 1) advance += font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    x += advance + letterSpacing;
  });
  const d = parts.join(' ');
  if (/NaN|Infinity/.test(d)) throw new Error(`Invalid outline generated for "${text}"`);
  return { d, bbox: { x1: minX, y1: minY, x2: maxX, y2: maxY }, width: x - letterSpacing };
}

// Pull the inner drawing of an SVG file (everything between the root <svg> tags).
function svgInner(svg) {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

const markDark = read(brand('rosavin-mark.svg'));
const markLight = read(brand('rosavin-mark-light.svg'));
const MARK_VIEWBOX = { x: -380, y: -380, w: 760, h: 760 }; // square sunflower, centred on (0, 0)

function lockup({ variant, tagline }) {
  const isLight = variant === 'light';
  const mark = svgInner(isLight ? markLight : markDark);
  const word = textPath(path.join(fontsDir, 'Fraunces-SemiBold.ttf'), 'Rosavin', 200, { letterSpacing: 2 });
  const tag = tagline
    ? textPath(path.join(fontsDir, 'BeVietnamPro-SemiBold.ttf'), 'STAY AWAKE, NATURALLY', 46, { letterSpacing: 9 })
    : null;

  const markH = 290; // rendered mark height
  const markScale = markH / MARK_VIEWBOX.h;
  const markW = MARK_VIEWBOX.w * markScale;
  const gap = 46;
  const wordX = markW + gap - word.bbox.x1;
  // Align the wordmark with the centre of the flower.
  const markCenterY = (0 - MARK_VIEWBOX.y) * markScale; // y of the flower centre inside the mark box
  const baseline = markCenterY + (tag ? 30 : 58);
  const width = wordX + Math.max(word.width, tag ? tag.width : 0) + 24;
  const height = tag ? markH + 10 : markH;
  const ink = isLight ? '#0F3D2E' : '#FFF6E2';
  const tagInk = isLight ? '#B26B1F' : '#F6C35C';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(0)} ${height}" role="img" aria-label="Rosavin">
  <g transform="translate(${(-MARK_VIEWBOX.x * markScale).toFixed(2)} ${(-MARK_VIEWBOX.y * markScale).toFixed(2)}) scale(${markScale.toFixed(5)})">${mark}</g>
  <path transform="translate(${wordX.toFixed(2)} ${baseline.toFixed(2)})" fill="${ink}" d="${word.d}"/>
  ${tag ? `<path transform="translate(${(wordX + 4).toFixed(2)} ${(baseline + 78).toFixed(2)})" fill="${tagInk}" d="${tag.d}"/>` : ''}
</svg>
`;
}

// ---------------------------------------------------------------------------
// DMG background (660 x 400 window). Finder draws the two icons on top at
// (180, 196) and (480, 196) - see electron-builder.yml.
// ---------------------------------------------------------------------------
function dmgBackground() {
  const word = textPath(path.join(fontsDir, 'Fraunces-SemiBold.ttf'), 'Rosavin', 44, { letterSpacing: 0.5 });
  const mark = svgInner(markLight);
  const markScale = 46 / MARK_VIEWBOX.h;
  const markW = MARK_VIEWBOX.w * markScale;
  const total = markW + 12 + word.width;
  const startX = (660 - total) / 2;
  const en = textPath(path.join(fontsDir, 'BeVietnamPro-Medium.ttf'), 'Drag Rosavin into Applications to install', 15);
  const vi = textPath(path.join(fontsDir, 'BeVietnamPro-Regular.ttf'), 'Kéo Rosavin vào thư mục Applications để cài đặt', 13.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDF9F0"/>
      <stop offset="1" stop-color="#F1E7D2"/>
    </linearGradient>
    <radialGradient id="sun" cx="330" cy="196" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFD978" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#FFD978" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="arrow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#E9A23B"/>
      <stop offset="1" stop-color="#1F7356"/>
    </linearGradient>
  </defs>
  <rect width="660" height="400" fill="url(#bg)"/>
  <rect width="660" height="400" fill="url(#sun)"/>
  <!-- faint botanical leaves in the corners -->
  <g fill="#1F7356" opacity="0.07">
    <path d="M-20 400 C 40 300 140 280 200 300 C 140 330 70 370 -20 400 Z"/>
    <path d="M680 0 C 620 90 520 110 460 92 C 520 64 590 28 680 0 Z"/>
    <path d="M600 420 C 610 340 660 300 700 290 C 690 340 660 390 600 420 Z"/>
  </g>
  <g transform="translate(${(startX - MARK_VIEWBOX.x * markScale).toFixed(2)} ${(62 - MARK_VIEWBOX.y * markScale - 30).toFixed(2)}) scale(${markScale.toFixed(5)})">${mark}</g>
  <path transform="translate(${(startX + markW + 12 - word.bbox.x1).toFixed(2)} 74)" fill="#0F3D2E" d="${word.d}"/>
  <!-- arrow between the app and the Applications folder -->
  <path d="M262 196 C 300 168 360 168 398 196" fill="none" stroke="url(#arrow)" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 12"/>
  <path d="M388 182 L 402 199 L 381 203" fill="none" stroke="#1F7356" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path transform="translate(${((660 - en.width) / 2).toFixed(2)} 334)" fill="#24453A" d="${en.d}"/>
  <path transform="translate(${((660 - vi.width) / 2).toFixed(2)} 358)" fill="#6B7F77" d="${vi.d}"/>
</svg>
`;
}

// ---------------------------------------------------------------------------
function main() {
  const iconSvg = read(brand('rosavin-icon.svg'));

  // 1) App icon PNG + ICNS + ICO
  writePng(p('build', 'icon.png'), iconSvg, 1024);
  writePng(p('src', 'assets', 'icon.png'), iconSvg, 512);

  const iconset = path.join(os.tmpdir(), `rosavin-${process.pid}.iconset`);
  mkdir(iconset);
  for (const s of [16, 32, 128, 256, 512]) {
    writePng(path.join(iconset, `icon_${s}x${s}.png`), iconSvg, s);
    writePng(path.join(iconset, `icon_${s}x${s}@2x.png`), iconSvg, s * 2);
  }
  if (process.platform === 'darwin') {
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', p('build', 'icon.icns')]);
  } else {
    console.warn('! iconutil is macOS-only; build/icon.icns was not regenerated');
  }
  fs.rmSync(iconset, { recursive: true, force: true });

  // Windows: the app icon keeps the macOS squircle; small sizes are rendered
  // with the mark filling more of the tile for legibility.
  writeIco(p('build', 'icon.ico'), [16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: render(iconSvg, size) })));

  // 2) Tray icons
  const trayDir = p('src', 'assets', 'tray');
  mkdir(trayDir);
  for (const [name, file] of [['trayActiveTemplate', 'tray-active.svg'], ['trayInactiveTemplate', 'tray-inactive.svg']]) {
    const svg = read(brand(file));
    writePng(path.join(trayDir, `${name}.png`), svg, 18);
    writePng(path.join(trayDir, `${name}@2x.png`), svg, 36);
    writePng(path.join(trayDir, `${name}@3x.png`), svg, 54);
  }
  for (const [name, file] of [['tray-win-active', 'tray-win-active.svg'], ['tray-win-inactive', 'tray-win-inactive.svg']]) {
    const svg = read(brand(file));
    writeIco(path.join(trayDir, `${name}.ico`), [16, 20, 24, 32, 40, 48, 64].map((size) => ({ size, data: render(svg, size) })));
    writePng(path.join(trayDir, `${name}.png`), svg, 32);
  }

  // 3) Logo lockups
  const logoDark = lockup({ variant: 'dark', tagline: true });
  const logoLight = lockup({ variant: 'light', tagline: true });
  const wordDark = lockup({ variant: 'dark', tagline: false });
  fs.writeFileSync(brand('rosavin-logo-dark.svg'), logoDark);
  fs.writeFileSync(brand('rosavin-logo-light.svg'), logoLight);
  fs.writeFileSync(brand('rosavin-wordmark-dark.svg'), wordDark);
  writePng(brand('rosavin-logo-dark.png'), logoDark, 1600);
  writePng(brand('rosavin-logo-light.png'), logoLight, 1600);
  writePng(brand('rosavin-icon-1024.png'), iconSvg, 1024);

  const uiBrand = p('src', 'renderer', 'images', 'brand');
  mkdir(uiBrand);
  fs.copyFileSync(brand('rosavin-mark.svg'), path.join(uiBrand, 'mark.svg'));
  fs.copyFileSync(brand('rosavin-wordmark-dark.svg'), path.join(uiBrand, 'wordmark-dark.svg'));
  writePng(path.join(uiBrand, 'icon-256.png'), iconSvg, 256);

  mkdir(p('docs', 'images'));
  writePng(p('docs', 'images', 'logo-light.png'), logoLight, 1200);
  writePng(p('docs', 'images', 'logo-dark.png'), logoDark, 1200);
  writePng(p('docs', 'images', 'icon.png'), iconSvg, 512);

  // 4) DMG background (1x + 2x, combined into a HiDPI TIFF on macOS)
  const dmg = dmgBackground();
  fs.writeFileSync(brand('dmg-background.svg'), dmg);
  writePng(p('build', 'background.png'), dmg, 660);
  writePng(p('build', 'background@2x.png'), dmg, 1320);
  if (process.platform === 'darwin') {
    execFileSync('tiffutil', ['-cathidpicheck', p('build', 'background.png'), p('build', 'background@2x.png'), '-out', p('build', 'background.tiff')]);
  }

  console.log('✓ Brand assets generated');
}

main();
