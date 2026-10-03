'use strict';

const { isValidDuration } = require('../shared/time');

// Rosavin can be controlled from scripts, Shortcuts or a terminal:
//
//   macOS    open "rosavin://activate?minutes=30"
//            /Applications/Rosavin.app/Contents/MacOS/Rosavin --activate=30
//   Windows  start rosavin://deactivate
//            "%LOCALAPPDATA%\Programs\Rosavin\Rosavin.exe" --toggle
//
// Supported actions: activate (optional minutes), deactivate, toggle, show,
// benefits, preferences. "--hidden" starts Rosavin without opening the window.

const PROTOCOL = 'rosavin';
const ACTIONS = new Set(['activate', 'deactivate', 'toggle', 'show', 'benefits', 'preferences']);

function parseMinutes(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && isValidDuration(n) ? n : undefined;
}

/** Parse a rosavin:// URL into a command, or null. */
function parseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${PROTOCOL}:`) return null;
  // rosavin://activate?minutes=30 → host "activate"; rosavin:activate → pathname "activate"
  const action = (url.hostname || url.pathname.replace(/^\/+/, '')).toLowerCase();
  if (!ACTIONS.has(action)) return null;
  const command = { action };
  const minutes = parseMinutes(url.searchParams.get('minutes'));
  if (action === 'activate' && minutes !== undefined) command.minutes = minutes;
  return command;
}

/**
 * Parse process arguments. Returns { commands, hidden }.
 * Unknown arguments (Electron/Chromium switches, the app path…) are ignored.
 */
function parseArgv(argv) {
  const commands = [];
  let hidden = false;
  for (const arg of argv) {
    if (typeof arg !== 'string') continue;
    if (arg.startsWith(`${PROTOCOL}:`)) {
      const command = parseUrl(arg);
      if (command) commands.push(command);
      continue;
    }
    const match = /^--(activate|deactivate|toggle|show|benefits|preferences|hidden)(?:=(.*))?$/.exec(arg);
    if (!match) continue;
    const [, name, value] = match;
    if (name === 'hidden') {
      hidden = true;
    } else if (name === 'activate') {
      const minutes = parseMinutes(value);
      commands.push(minutes === undefined ? { action: 'activate' } : { action: 'activate', minutes });
    } else {
      commands.push({ action: name });
    }
  }
  return { commands, hidden };
}

module.exports = { PROTOCOL, parseArgv, parseUrl };
