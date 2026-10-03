#!/usr/bin/env node
// Vẽ các hình minh họa cho HUONG_DAN_TAO_ANH_MENU.md rồi xuất file .docx.
//
//   node guides/huong-dan-anh-menu/make-images.mjs
//
// Cần: các gói npm của dự án (@resvg/resvg-js), sips (có sẵn trên macOS), pandoc 3+.

import { Resvg } from '@resvg/resvg-js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const img = (name) => path.join(here, 'images', name);
const font = "font-family=\"-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif\"";

function save(svg, name) {
  const png = new Resvg(svg, { font: { loadSystemFonts: true }, shapeRendering: 2 }).render().asPng();
  fs.writeFileSync(img(name), png);
  console.log(`  ✓ images/${name}`);
}

// 1. Ảnh menu có đánh số chú thích ------------------------------------------
function annotated() {
  const jpg = fs.readFileSync(img('menu-en.jpg')).toString('base64');
  const marks = [
    [1, 1060, 25, 'Biểu tượng + “38m”'],
    [2, 1295, 70, 'Đồng hồ cố định'],
    [3, 1200, 87, 'Dòng trạng thái'],
    [4, 1205, 229, 'Dấu ✓ thật'],
    [5, 1205, 188, 'Mục được tô xanh'],
    [6, 360, 188, 'Menu con mở sang trái'],
    [7, 1205, 472, 'Phím tắt ⌘Q'],
    [8, 150, 640, 'Hình nền vẽ bằng CSS'],
  ];
  const dots = marks.map(([n, x, y]) => `
    <circle cx="${x}" cy="${y}" r="21" fill="#F6B548" stroke="#fff" stroke-width="4"/>
    <text x="${x}" y="${y + 8}" text-anchor="middle" font-size="23" font-weight="700" fill="#3B2600" ${font}>${n}</text>`).join('');
  const legend = marks.map(([n, , , label], i) => {
    const x = 40 + (i % 4) * 340, y = 790 + Math.floor(i / 4) * 52;
    return `<circle cx="${x}" cy="${y}" r="17" fill="#F6B548"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="19" font-weight="700" fill="#3B2600" ${font}>${n}</text>
      <text x="${x + 30}" y="${y + 7}" font-size="21" fill="#1F2A24" ${font}>${label}</text>`;
  }).join('');
  save(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
    <rect width="1400" height="900" fill="#FBF7EE"/>
    <image href="data:image/jpeg;base64,${jpg}" x="0" y="0" width="1400" height="725"/>
    ${dots}${legend}</svg>`, 'giai-phau-anh.png');
}

// 2. Sơ đồ quy trình 6 bước ------------------------------------------------
function pipeline() {
  const steps = [
    ['Mở app', 'Playwright mở Rosavin', 'hồ sơ tạm, an toàn'],
    ['Giả lập phiên', 'bật 60 phút, lùi 22 phút', '→ “38 min left”'],
    ['Lấy menu thật', 'buildMenu() của app', 'nhãn, ✓, phím tắt'],
    ['Dựng HTML', 'menu kiểu macOS', 'icon thật, nền xanh–vàng'],
    ['Chụp phần tử', 'cửa sổ không viền', 'khối #scene, nét 2×'],
    ['Nén JPEG', 'sips, chất lượng 84', 'rộng tối đa 1400 px'],
  ];
  const w = 210, gap = 26, x0 = 30;
  const boxes = steps.map(([title, l1, l2], i) => {
    const x = x0 + i * (w + gap);
    const arrow = i < steps.length - 1
      ? `<path d="M${x + w + 4} 170 l${gap - 10} 0" stroke="#C98A1B" stroke-width="4"/><path d="M${x + w + gap - 4} 170 l-10 -8 v16 z" fill="#C98A1B"/>` : '';
    return `<rect x="${x}" y="70" width="${w}" height="200" rx="18" fill="#fff" stroke="#E6D9BF" stroke-width="2"/>
      <rect x="${x}" y="70" width="${w}" height="8" rx="4" fill="${i === 3 ? '#F6B548' : '#2F8A69'}"/>
      <circle cx="${x + 38}" cy="114" r="20" fill="${i === 3 ? '#F6B548' : '#2F8A69'}"/>
      <text x="${x + 38}" y="122" text-anchor="middle" font-size="21" font-weight="700" fill="#fff" ${font}>${i + 1}</text>
      <text x="${x + w - 18}" y="120" text-anchor="end" font-size="15" font-weight="700" fill="#9AA79F" ${font}>BƯỚC ${i + 1}</text>
      <text x="${x + 18}" y="165" font-size="22" font-weight="700" fill="#16352A" ${font}>${title}</text>
      <text x="${x + 18}" y="200" font-size="15.5" fill="#33453C" ${font}>${l1}</text>
      <text x="${x + 18}" y="226" font-size="15.5" fill="#6B7A72" ${font}>${l2}</text>${arrow}`;
  }).join('');
  save(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="330" viewBox="0 0 1440 330">
    <rect width="1440" height="330" rx="24" fill="#F4EEE1"/>
    <text x="30" y="46" font-size="24" font-weight="700" fill="#16352A" ${font}>npm run screenshots — từ mã nguồn đến ảnh menu</text>
    ${boxes}
    <text x="30" y="305" font-size="16" fill="#6B7A72" ${font}>Không cần quyền Ghi màn hình · chạy lại được bất cứ lúc nào · chữ trong ảnh luôn khớp với app</text>
  </svg>`, 'quy-trinh.png');
}

// 3. Vì sao không chụp thẳng được -------------------------------------------
function whyNot() {
  const col = (x, title, color, lines) => `
    <rect x="${x}" y="60" width="600" height="250" rx="20" fill="#fff" stroke="${color}" stroke-width="3"/>
    <circle cx="${x + 46}" cy="100" r="18" fill="${color}"/>
    <path d="${color === '#2F8A69' ? `M${x + 37} 100 l6 7 l12 -14` : `M${x + 39} 93 l14 14 M${x + 53} 93 l-14 14`}" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x + 76}" y="108" font-size="23" font-weight="700" fill="${color}" ${font}>${title}</text>
    ${lines.map((l, i) => `<text x="${x + 28}" y="${156 + i * 40}" font-size="19" fill="#26352E" ${font}>${l}</text>`).join('')}`;
  save(`<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="350" viewBox="0 0 1300 350">
    <rect width="1300" height="350" rx="24" fill="#F4EEE1"/>
    <text x="40" y="40" font-size="22" font-weight="700" fill="#16352A" ${font}>Playwright nhìn thấy gì?</text>
    ${col(40, 'Chụp được: cửa sổ Rosavin', '#2F8A69', ['Nội dung web bên trong cửa sổ Electron', 'page.screenshot() đọc thẳng từ Chromium', 'Không cần cấp quyền gì cho macOS', 'Ảnh 01, 02, 05–14 là ảnh chụp thật'])}
    ${col(660, 'Không chụp được: menu trên thanh menu', '#C2412D', ['macOS tự vẽ menu, không phải trang web', 'Nằm ngoài mọi cửa sổ của app', 'Muốn chụp phải cấp quyền Ghi màn hình', '→ Ảnh 03, 04 được dựng lại bằng HTML'])}
  </svg>`, 'vi-sao.png');
}

console.log('Vẽ hình minh họa');
annotated();
pipeline();
whyNot();
for (const name of ['giai-phau-anh', 'quy-trinh', 'vi-sao']) {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', img(`${name}.png`), '--out', img(`${name}.jpg`)], { stdio: 'ignore' });
  fs.rmSync(img(`${name}.png`));
}

console.log('Xuất .docx');
execFileSync('pandoc', [
  path.join(here, 'HUONG_DAN_TAO_ANH_MENU.md'),
  '-o', path.join(here, 'HUONG_DAN_TAO_ANH_MENU.docx'),
  '--resource-path', here,
  '--reference-doc', path.join(root, 'docs', 'reference.docx'),
  '--lua-filter', path.join(root, 'scripts', 'docx-filter.lua'),
], { stdio: 'inherit' });
console.log('  ✓ HUONG_DAN_TAO_ANH_MENU.docx');
