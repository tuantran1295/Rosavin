'use strict';

const { execFile } = require('node:child_process');

// Rosavin can only block *idle* sleep. If the computer sleeps during a session
// anyway, something asked for it or forced it: Sleep in the Apple menu, the
// power button, closing the lid, a nearly empty battery. macOS records the
// reason of every sleep in `pmset -g log`, for example:
//
//   2026-10-23 12:47:50 +0700 Sleep   Entering Sleep state due to 'Software Sleep pid=473':TCPKeepAlive=active …
const SLEEP_LINE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})\s+Sleep\s+Entering Sleep state due to '([^']+)'/;

const KINDS = [
  ['manual', /software sleep|power button/i], // Apple menu › Sleep, the power button, a shortcut or script
  ['lid', /clamshell/i],
  ['battery', /low power/i],
  ['thermal', /thermal/i],
  ['idle', /idle sleep/i],
];

// The sleep is logged a few seconds after apps are told about it.
const SLACK_MS = 10_000;

function classify(reason) {
  return KINDS.find(([, pattern]) => pattern.test(reason))?.[0] ?? 'other';
}

/**
 * The first sleep that started at or after `since` (ms). Later entries are the
 * short maintenance wakes macOS does while asleep, so the first one is the cause.
 * @param {string} log  output of `pmset -g log`
 * @param {number} since
 * @returns {{ at: number, reason: string, kind: string } | null}
 */
function findSleepReason(log, since) {
  const lines = log.split('\n');
  let found = null;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const match = SLEEP_LINE.exec(lines[i]);
    if (!match) continue;
    const [, date, time, tzHours, tzMinutes, reason] = match;
    const at = Date.parse(`${date}T${time}${tzHours}:${tzMinutes}`);
    if (at < since - SLACK_MS) break;
    found = { at, reason, kind: classify(reason) };
  }
  return found;
}

function readPmsetLog() {
  return new Promise((resolve) => {
    execFile('/usr/bin/pmset', ['-g', 'log'], { maxBuffer: 256 * 1024 * 1024, timeout: 30_000 }, (err, stdout) => resolve(err ? '' : stdout));
  });
}

/**
 * Why did the computer sleep after `since`? macOS only; elsewhere the reason is unknown (null).
 * @param {number} since
 * @param {{ platform?: string, read?: () => Promise<string> }} [options]
 */
async function getSleepReason(since, { platform = process.platform, read = readPmsetLog } = {}) {
  if (platform !== 'darwin') return null;
  try {
    return findSleepReason(await read(), since);
  } catch {
    return null;
  }
}

module.exports = { classify, findSleepReason, getSleepReason };
