// Duration presets and formatting shared by the main process (require) and the
// renderer (loaded as a classic <script>, exposed as window.AppFormat).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AppFormat = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Minutes. 0 means "until turned off".
  const DURATION_PRESETS = [0, 5, 15, 30, 60, 120, 240];
  // The quick chips shown in the window.
  const QUICK_DURATIONS = [0, 15, 30, 60, 120, 240];

  function template(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (m, key) => (vars && key in vars ? String(vars[key]) : m));
  }

  function formatDuration(minutes, dict) {
    const d = dict.durations;
    if (!minutes) return d.indefinitely;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hours = h ? template(h === 1 ? d.hour : d.hours, { n: h }) : '';
    const mins = m ? template(m === 1 ? d.minute : d.minutes, { n: m }) : '';
    return [hours, mins].filter(Boolean).join(' ');
  }

  function formatDurationShort(minutes, dict) {
    const s = dict.durations.short;
    if (!minutes) return s.indefinitely;
    if (minutes < 60) return template(s.m, { n: minutes });
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? template(s.hm, { h, mm: String(m).padStart(2, '0') }) : template(s.h, { n: h });
  }

  // style: 'long' → "1 h 05 min" | 'compact' → "1h05"
  function formatRemaining(ms, dict, style) {
    const t = style === 'compact' ? dict.remaining.compact : dict.remaining.long;
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    if (totalSec < 60) return template(t.s, { s: totalSec });
    const totalMin = Math.ceil(totalSec / 60);
    if (totalMin < 60) return template(t.m, { m: totalMin });
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return template(t.hm, { h, m, mm: String(m).padStart(2, '0') });
  }

  function formatClock(timestamp, localeTag) {
    return new Date(timestamp).toLocaleTimeString(localeTag || 'en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return { DURATION_PRESETS, QUICK_DURATIONS, template, formatDuration, formatDurationShort, formatRemaining, formatClock };
});
