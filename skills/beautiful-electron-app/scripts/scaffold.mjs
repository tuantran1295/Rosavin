#!/usr/bin/env node
// Creates a new Electron app from the skill's starter (assets/starter).
//
//   node scaffold.mjs --name "Focus Bloom" --dir ~/code/focus-bloom \
//     [--tagline "Deep work, beautifully."] [--app-id com.example.focusbloom] \
//     [--protocol focusbloom] [--force]
//
// Then: cd <dir> && npm install && npm run assets && npm start

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const starter = path.join(here, '..', 'assets', 'starter');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const name = arg('name');
const dirArg = arg('dir');
if (!name || !dirArg) {
  console.error('Usage: node scaffold.mjs --name "App Name" --dir <target> [--tagline "..."] [--app-id com.example.app] [--protocol scheme] [--force]');
  process.exit(1);
}
if (!/^[\p{L}\p{N}][\p{L}\p{N} .&'-]{0,40}$/u.test(name)) {
  console.error('The name may contain letters, numbers, spaces and . & \' - (max 41 characters).');
  process.exit(1);
}

const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
const compact = slug.replace(/-/g, '');
const values = {
  __APP_NAME__: name,
  __APP_SLUG__: slug,
  __APP_ID__: arg('app-id', `com.${compact}.app`),
  __PROTOCOL__: arg('protocol', compact.replace(/^[^a-z]+/, '') || 'app'),
  __TAGLINE__: arg('tagline', 'A beautiful desktop app.'),
  __YEAR__: String(new Date().getFullYear()),
};
if (!/^[a-z][a-z0-9+.-]*$/.test(values.__PROTOCOL__)) {
  console.error(`Invalid --protocol "${values.__PROTOCOL__}" (lowercase letters, digits, + . -; must start with a letter).`);
  process.exit(1);
}

const target = path.resolve(dirArg.replace(/^~(?=$|\/)/, process.env.HOME || '~'));
if (fs.existsSync(target) && fs.readdirSync(target).length && !flag('force')) {
  console.error(`${target} is not empty (use --force to write into it anyway).`);
  process.exit(1);
}

// Escape each value for the file type it lands in.
const escapers = {
  '.js': (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`'),
  '.mjs': (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`'),
  '.json': (v) => JSON.stringify(v).slice(1, -1),
  '.html': (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  '.svg': (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  '.yml': (v) => v,
  '.md': (v) => v,
};
const TEXT = new Set(['.js', '.mjs', '.json', '.html', '.css', '.svg', '.yml', '.md', '.txt', '']);

let files = 0;
function copy(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (['node_modules', 'release', '.DS_Store'].includes(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copy(from, to);
      continue;
    }
    const ext = path.extname(entry.name);
    if (TEXT.has(ext)) {
      const escape = escapers[ext] || ((v) => v);
      let text = fs.readFileSync(from, 'utf8');
      for (const [key, value] of Object.entries(values)) text = text.split(key).join(escape(value));
      fs.writeFileSync(to, text);
    } else {
      fs.copyFileSync(from, to);
    }
    files++;
  }
}
copy(starter, target);

console.log(`✓ Created "${name}" in ${target} (${files} files)
  appId ${values.__APP_ID__} · protocol ${values.__PROTOCOL__}://

Next:
  cd ${JSON.stringify(target)}
  npm install
  npm run assets     # renders the placeholder brand; replace assets/brand/*.svg with your own
  npm start
`);
