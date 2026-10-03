'use strict';

// Control the app from scripts, Shortcuts or a terminal:
//   macOS    open "__PROTOCOL__://start?minutes=30"
//            /Applications/__APP_NAME__.app/Contents/MacOS/__APP_NAME__ --start=30
//   Windows  start __PROTOCOL__://stop
// Actions: start (optional minutes), stop, toggle, show, learn, preferences.
// "--hidden" starts the app without opening its window.

const PROTOCOL = '__PROTOCOL__';
const ACTIONS = new Set(['start', 'stop', 'toggle', 'show', 'learn', 'preferences']);

function parseMinutes(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 24 * 60 ? n : undefined;
}

function parseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${PROTOCOL}:`) return null;
  const action = (url.hostname || url.pathname.replace(/^\/+/, '')).toLowerCase();
  if (!ACTIONS.has(action)) return null;
  const command = { action };
  const minutes = parseMinutes(url.searchParams.get('minutes'));
  if (action === 'start' && minutes !== undefined) command.minutes = minutes;
  return command;
}

/** Returns { commands, hidden }; Electron/Chromium switches are ignored. */
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
    const match = /^--(start|stop|toggle|show|learn|preferences|hidden)(?:=(.*))?$/.exec(arg);
    if (!match) continue;
    const [, name, value] = match;
    if (name === 'hidden') hidden = true;
    else if (name === 'start') {
      const minutes = parseMinutes(value);
      commands.push(minutes === undefined ? { action: 'start' } : { action: 'start', minutes });
    } else commands.push({ action: name });
  }
  return { commands, hidden };
}

module.exports = { PROTOCOL, parseArgv, parseUrl };
