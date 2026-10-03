#!/usr/bin/env node
// Converts the Markdown user guides to Word documents with pandoc.
//
//   npm run docs:docx
//
// Requires pandoc 3+ (https://pandoc.org/installing.html). The Word styling
// comes from docs/reference.docx (regenerate it with scripts/docx-template.py).

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');

const GUIDES = [
  { lang: 'en', locale: 'en-US', subject: 'Rosavin user guide: how to use Rosavin on macOS and Windows' },
  { lang: 'vi', locale: 'vi-VN', subject: 'Hướng dẫn sử dụng Rosavin trên macOS và Windows' },
];

try {
  execFileSync('pandoc', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('pandoc is not installed. Install it from https://pandoc.org/installing.html (macOS: brew install pandoc).');
  process.exit(1);
}

for (const guide of GUIDES) {
  const input = path.join(docs, `USER_GUIDE.${guide.lang}.md`);
  const output = path.join(docs, `USER_GUIDE.${guide.lang}.docx`);
  execFileSync('pandoc', [
    input,
    '--from', 'markdown+gfm_auto_identifiers-yaml_metadata_block',
    '--to', 'docx',
    '--resource-path', docs,
    '--reference-doc', path.join(docs, 'reference.docx'),
    '--lua-filter', path.join(root, 'scripts', 'docx-filter.lua'),
    '--metadata', `lang=${guide.locale}`,
    '--metadata', `subject=${guide.subject}`,
    '--output', output,
  ], { stdio: 'inherit', cwd: docs });
  console.log(`✓ ${path.relative(root, output)}`);
}
