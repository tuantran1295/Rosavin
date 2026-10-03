// Small hand-drawn icon set (24×24, stroke = currentColor). Exposed as window.RosavinIcons.
(function () {
  'use strict';
  const paths = {
    gear: '<path d="M9.96 4.89 L10.17 2.58 L13.83 2.58 L14.04 4.89 L15.59 5.53 L17.37 4.04 L19.96 6.63 L18.47 8.41 L19.11 9.96 L21.42 10.17 L21.42 13.83 L19.11 14.04 L18.47 15.59 L19.96 17.37 L17.37 19.96 L15.59 18.47 L14.04 19.11 L13.83 21.42 L10.17 21.42 L9.96 19.11 L8.41 18.47 L6.63 19.96 L4.04 17.37 L5.53 15.59 L4.89 14.04 L2.58 13.83 L2.58 10.17 L4.89 9.96 L5.53 8.41 L4.04 6.63 L6.63 4.04 L8.41 5.53 Z"/><circle cx="12" cy="12" r="3.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    battery: '<rect x="2.5" y="7" width="16.5" height="10" rx="2.2"/><path d="M21.5 10.2v3.6"/><path d="M6.5 10.2v3.6M10 10.2v3.6M13.5 10.2v3.6"/>',
    focus: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    shield: '<path d="M12 3l7 3v5.2c0 4.5-3 8.2-7 9.8-4-1.6-7-5.3-7-9.8V6l7-3z"/><path d="M9 12.2l2.1 2.1L15.2 10"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    activity: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    leaf: '<path d="M5 19.5C4.5 11 9.5 5.2 19.5 4.5 20 14 14.6 19.4 6 19.5"/><path d="M5 19.5l8-8"/>',
    wave: '<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    brain: '<path d="M9.5 4.5A2.8 2.8 0 0 0 6.7 7v.3A3 3 0 0 0 4.5 10.2c0 .9.4 1.7 1 2.3a3 3 0 0 0 1.2 4.8A2.9 2.9 0 0 0 9.5 20h.5V4.5h-.5z"/><path d="M14.5 4.5A2.8 2.8 0 0 1 17.3 7v.3a3 3 0 0 1 2.2 2.9c0 .9-.4 1.7-1 2.3a3 3 0 0 1-1.2 4.8 2.9 2.9 0 0 1-2.8 2.7H14V4.5h.5z"/>',
    bolt: '<path d="M13 2.5L5 14h6l-1 7.5L18 10h-6l1-7.5z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    alert: '<path d="M12 3.6L2.8 19.5h18.4L12 3.6z"/><path d="M12 10v4.4"/><path d="M12 17.1h.01"/>',
    stethoscope: '<path d="M6 3.5v4.8a4 4 0 0 0 8 0V3.5"/><path d="M10 12.3v2.4a5 5 0 0 0 10 0v-1"/><circle cx="20" cy="11.7" r="2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.7 2.7L16 9.8"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16v4"/>',
    sunflower: '<circle cx="12" cy="12" r="3.3"/><path d="M12 2.6c1.5 1.3 1.5 3.3 0 4.6-1.5-1.3-1.5-3.3 0-4.6zM12 16.8c1.5 1.3 1.5 3.3 0 4.6-1.5-1.3-1.5-3.3 0-4.6zM2.6 12c1.3-1.5 3.3-1.5 4.6 0-1.3 1.5-3.3 1.5-4.6 0zM16.8 12c1.3-1.5 3.3-1.5 4.6 0-1.3 1.5-3.3 1.5-4.6 0zM5.35 5.35c2-.1 3.4 1.3 3.25 3.25-2 .15-3.4-1.25-3.25-3.25zM15.4 15.4c2-.15 3.4 1.25 3.25 3.25-2 .15-3.4-1.25-3.25-3.25zM18.65 5.35c.1 2-1.3 3.4-3.25 3.25-.15-2 1.25-3.4 3.25-3.25zM8.6 15.4c.15 2-1.25 3.4-3.25 3.25-.15-2 1.25-3.4 3.25-3.25z"/>',
    moon: '<path d="M20.2 14.6A8.4 8.4 0 1 1 9.4 3.8a6.6 6.6 0 0 0 10.8 10.8z"/>',
    power: '<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
    book: '<path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15H7a2.5 2.5 0 0 0-2.5 2.5v-15z"/><path d="M4.5 20.5A2.5 2.5 0 0 1 7 18h12.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    sprout: '<path d="M12 20v-8"/><path d="M12 12C12 8 9.5 5.5 5 5.5c0 4.2 2.6 6.5 7 6.5z"/><path d="M12 14c0-3.4 2.3-5.8 7-5.8 0 3.6-2.4 5.8-7 5.8z"/>',
    flask: '<path d="M9 3h6M10 3v6L4.6 18.2A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.8L14 9V3"/><path d="M7.5 15h9"/>',
  };

  function icon(name, extraClass) {
    const body = paths[name] || paths.info;
    const cls = extraClass ? ` class="icon ${extraClass}"` : ' class="icon"';
    return `<svg${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  window.RosavinIcons = { icon, names: Object.keys(paths) };
})();
