// Duration presets and time formatting shared by the main process (require)
// and the renderer (loaded as a classic <script>, exposed as window.RosavinTime).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RosavinTime = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Minutes. 0 means "indefinitely".
  const DURATION_PRESETS = [0, 5, 10, 15, 30, 60, 120, 180, 300, 480];
  // The quick chips shown in the main window.
  const QUICK_DURATIONS = [0, 15, 30, 60, 120, 300];

  function template(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (m, key) => (vars && key in vars ? String(vars[key]) : m));
  }

  function isValidDuration(minutes) {
    return Number.isInteger(minutes) && minutes >= 0 && minutes <= 24 * 60;
  }

  // "Indefinitely", "15 minutes", "1 hour", "2 hours", "1 hour 30 minutes"
  function formatDuration(minutes, dict) {
    const d = dict.durations;
    if (!minutes) return d.indefinitely;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hours = h ? template(h === 1 ? d.hour : d.hours, { n: h }) : '';
    const mins = m ? template(m === 1 ? d.minute : d.minutes, { n: m }) : '';
    return [hours, mins].filter(Boolean).join(' ');
  }

  // Short chip label: "∞", "15m", "1h", "1h30"
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

  // Wall-clock time in the UI language, e.g. "3:45 PM" / "15:45".
  function formatClock(timestamp, localeCode) {
    const tag = localeCode === 'vi' ? 'vi-VN' : 'en-US';
    return new Date(timestamp).toLocaleTimeString(tag, { hour: 'numeric', minute: '2-digit' });
  }

  return {
    DURATION_PRESETS,
    QUICK_DURATIONS,
    template,
    isValidDuration,
    formatDuration,
    formatDurationShort,
    formatRemaining,
    formatClock,
  };
});
