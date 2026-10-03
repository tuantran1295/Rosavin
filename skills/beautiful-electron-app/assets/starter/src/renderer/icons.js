// Hand-drawn icon set (24×24, stroke = currentColor), exposed as window.AppIcons.
// Add icons as path strings; never load icon fonts or remote images.
(function () {
  'use strict';
  const paths = {
    gear: '<path d="M9.96 4.89 L10.17 2.58 L13.83 2.58 L14.04 4.89 L15.59 5.53 L17.37 4.04 L19.96 6.63 L18.47 8.41 L19.11 9.96 L21.42 10.17 L21.42 13.83 L19.11 14.04 L18.47 15.59 L19.96 17.37 L17.37 19.96 L15.59 18.47 L14.04 19.11 L13.83 21.42 L10.17 21.42 L9.96 19.11 L8.41 18.47 L6.63 19.96 L4.04 17.37 L5.53 15.59 L4.89 14.04 L2.58 13.83 L2.58 10.17 L4.89 9.96 L5.53 8.41 L4.04 6.63 L6.63 4.04 L8.41 5.53 Z"/><circle cx="12" cy="12" r="3.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16v4"/>',
    power: '<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
    sprout: '<path d="M12 20v-8"/><path d="M12 12C12 8 9.5 5.5 5 5.5c0 4.2 2.6 6.5 7 6.5z"/><path d="M12 14c0-3.4 2.3-5.8 7-5.8 0 3.6-2.4 5.8-7 5.8z"/>',
    sparkle: '<path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/><path d="M19 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5z"/>',
    bolt: '<path d="M13 2.5L5 14h6l-1 7.5L18 10h-6l1-7.5z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-1.4-1.2-1.7-1.2-2.9 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7" r="1.1"/><circle cx="14.5" cy="7" r="1.1"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3l7 3v5.2c0 4.5-3 8.2-7 9.8-4-1.6-7-5.3-7-9.8V6l7-3z"/><path d="M9 12.2l2.1 2.1L15.2 10"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.7 2.7L16 9.8"/>',
    moon: '<path d="M20.2 14.6A8.4 8.4 0 1 1 9.4 3.8a6.6 6.6 0 0 0 10.8 10.8z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  };

  function icon(name, extraClass) {
    const body = paths[name] || paths.info;
    const cls = extraClass ? ` class="icon ${extraClass}"` : ' class="icon"';
    return `<svg${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  window.AppIcons = { icon, names: Object.keys(paths) };
})();
