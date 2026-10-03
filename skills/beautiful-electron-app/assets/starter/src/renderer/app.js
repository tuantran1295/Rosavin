// Renderer. Runs sandboxed; talks to the main process only via window.appApi (preload.js).
(function () {
  'use strict';

  const api = window.appApi;
  const { icon } = window.AppIcons;
  const Fmt = window.AppFormat;
  const RING_LENGTH = 2 * Math.PI * 100;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const store = {
    appName: '',
    state: null,
    settings: null,
    strings: null,
    locale: 'en',
    platform: 'darwin',
    version: '',
    versions: {},
    durations: { presets: [], quick: [] },
    languages: [],
  };
  let countdown = null;
  let learnTab = null;
  const focusStack = [];

  // ---------------------------------------------------------------- helpers
  function t(key, vars) {
    const value = key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), store.strings);
    if (typeof value !== 'string') return key;
    return vars ? Fmt.template(value, vars) : value;
  }

  /** h('p', { class: 'x', text: 'hi', onclick }, child…). Text is always set with textContent. */
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'icon') node.insertAdjacentHTML('afterbegin', icon(value));
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function renderIcons(root) {
    $$('[data-icon]', root).forEach((node) => {
      if (node.dataset.iconDone) return;
      node.insertAdjacentHTML('afterbegin', icon(node.dataset.icon));
      node.dataset.iconDone = '1';
    });
  }

  const isMac = () => store.platform === 'darwin';
  const openLink = (url) => url && api.openExternal(url);

  // ------------------------------------------------------------------- boot
  async function init() {
    Object.assign(store, await api.getSnapshot());
    document.documentElement.classList.add(`platform-${store.platform}`);
    renderIcons(document);
    bindEvents();
    applyLanguage();

    api.onState((state) => {
      store.state = state;
      renderState();
    });
    api.onSettings(({ settings, locale, strings }) => {
      const languageChanged = locale !== store.locale;
      Object.assign(store, { settings, locale, strings });
      if (languageChanged) applyLanguage();
      else renderSettings();
      renderState();
    });
    api.onNavigate(navigate);

    const view = new URLSearchParams(location.search).get('view');
    if (view && view !== 'home') navigate(view);
    requestAnimationFrame(() => document.body.classList.add('is-ready'));
  }

  // --------------------------------------------------------------- language
  function applyLanguage() {
    document.documentElement.lang = store.locale;
    $$('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    $$('[data-i18n-aria]').forEach((node) => node.setAttribute('aria-label', t(node.dataset.i18nAria)));
    $$('[data-i18n-title]').forEach((node) => node.setAttribute('title', t(node.dataset.i18nTitle)));
    $('#tray-hint').textContent = t(isMac() ? 'ui.trayHintMac' : 'ui.trayHintWin');
    $('#about-title').textContent = store.appName;
    $('#about-version').textContent = t('about.version', { version: store.version });
    $('#about-built').textContent = t('about.builtWith', { electron: store.versions.electron, chrome: store.versions.chrome });
    renderChips();
    renderLanguageSwitch();
    renderPrefs();
    renderLearn();
    renderSettings();
    renderState();
  }

  // ------------------------------------------------------------------ state
  function renderState() {
    const s = store.state;
    if (!s || !store.strings) return;
    const root = document.documentElement;
    root.classList.toggle('is-active', s.active);
    root.classList.toggle('is-indefinite', s.active && !s.endsAt);
    const orb = $('#orb');
    orb.setAttribute('aria-pressed', String(s.active));
    orb.setAttribute('aria-label', t(s.active ? 'ui.toggleOff' : 'ui.toggleOn'));
    $('#status-title').textContent = t(s.active ? 'ui.statusOnTitle' : 'ui.statusOffTitle');
    $$('.chip').forEach((chip) => {
      const minutes = Number(chip.dataset.minutes);
      const selected = s.active && s.durationMinutes === minutes;
      chip.classList.toggle('is-selected', selected);
      chip.classList.toggle('is-default', !s.active && minutes === store.settings.defaultDuration);
      chip.setAttribute('aria-pressed', String(selected));
    });
    updateCountdown();
    if (s.active && s.endsAt) {
      if (!countdown) countdown = setInterval(updateCountdown, 1000);
    } else if (countdown) {
      clearInterval(countdown);
      countdown = null;
    }
  }

  function updateCountdown() {
    const s = store.state;
    const sub = $('#status-sub');
    const ring = $('#orb-progress');
    if (!s.active) {
      sub.textContent = t('ui.statusOff');
      ring.style.strokeDashoffset = String(RING_LENGTH);
      return;
    }
    if (!s.endsAt) {
      sub.textContent = t('ui.statusOnIndefinite');
      ring.style.strokeDashoffset = '0';
      return;
    }
    const remaining = Math.max(0, s.endsAt - Date.now());
    sub.textContent = t('ui.statusOnUntil', {
      time: Fmt.formatClock(s.endsAt, store.strings.localeTag),
      remaining: Fmt.formatRemaining(remaining, store.strings, 'long'),
    });
    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - Math.min(1, remaining / (s.durationMinutes * 60_000))));
  }

  function renderChips() {
    $('#chips').replaceChildren(...store.durations.quick.map((minutes) => h('button', {
      class: minutes === 0 ? 'chip chip-infinity' : 'chip',
      type: 'button',
      title: Fmt.formatDuration(minutes, store.strings),
      'aria-label': Fmt.formatDuration(minutes, store.strings),
      dataset: { minutes: String(minutes) },
      text: Fmt.formatDurationShort(minutes, store.strings),
      onclick: () => (store.state.active && store.state.durationMinutes === minutes ? api.stop() : api.start(minutes)),
    })));
  }

  function renderLanguageSwitch() {
    $('#lang-switch').replaceChildren(...store.languages.map((lang) => h('button', {
      type: 'button',
      lang: lang.code,
      title: lang.name,
      'aria-label': lang.name,
      dataset: { lang: lang.code },
      text: lang.code.toUpperCase(),
      onclick: () => api.updateSettings({ language: lang.code }),
    })));
  }

  function renderSettings() {
    const s = store.settings;
    $('#example-option').checked = s.exampleOption;
    $('#show-at-startup').checked = s.showWindowOnLaunch;
    $$('#lang-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === store.locale)));
    $$('[data-setting]').forEach((control) => {
      const key = control.dataset.setting;
      if (control.type === 'checkbox') control.checked = Boolean(s[key]);
      else if (control.tagName === 'SELECT') control.value = String(s[key]);
      else if (control.classList.contains('segmented')) {
        $$('button', control).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === String(s[key]))));
      }
    });
  }

  // ------------------------------------------------------------ preferences
  function renderPrefs() {
    const label = (text, hint) => h('span', { class: 'pref-label' }, h('span', { text }), hint && h('span', { class: 'pref-hint', text: hint }));
    const switchRow = (key, text, hint) => h('label', { class: 'pref-row' }, label(text, hint),
      h('input', { class: 'switch', type: 'checkbox', role: 'switch', dataset: { setting: key }, onchange: (e) => api.updateSettings({ [key]: e.target.checked }) }));
    const selectRow = (key, text, hint, options, parse) => h('div', { class: 'pref-row' }, label(text, hint),
      h('select', { class: 'select', 'aria-label': text, dataset: { setting: key }, onchange: (e) => api.updateSettings({ [key]: parse(e.target.value) }) },
        ...options.map((o) => h('option', { value: o.value, text: o.label }))));
    const segmentedRow = (key, text, hint, options) => h('div', { class: 'pref-row' }, label(text, hint),
      h('div', { class: 'segmented', role: 'group', 'aria-label': text, dataset: { setting: key } },
        ...options.map((o) => h('button', { type: 'button', dataset: { value: o.value }, text: o.label, onclick: () => api.updateSettings({ [key]: o.value }) }))));

    $('#prefs-body').replaceChildren(
      h('section', { class: 'prefs-section' },
        h('h3', { text: t('prefs.general') }),
        switchRow('launchAtLogin', t('prefs.launchAtLogin'), isMac() ? t('prefs.launchAtLoginNoteMac') : null),
        switchRow('showWindowOnLaunch', t('prefs.showWindowOnLaunch')),
        selectRow('defaultDuration', t('prefs.defaultDuration'), t('prefs.defaultDurationHint'),
          store.durations.presets.map((m) => ({ value: String(m), label: Fmt.formatDuration(m, store.strings) })), Number),
        switchRow('notifyWhenFinished', t('prefs.notifyWhenFinished')),
        switchRow('exampleOption', t('prefs.exampleOption'), t('prefs.exampleOptionHint')),
      ),
      h('section', { class: 'prefs-section' },
        h('h3', { text: t(isMac() ? 'prefs.menuBarMac' : 'prefs.menuBarWin') }),
        isMac() && switchRow('showCountdown', t('prefs.showCountdown')),
        segmentedRow('clickAction', t('prefs.clickAction'), t('prefs.clickHint'), [
          { value: 'toggle', label: t('prefs.clickToggle') },
          { value: 'menu', label: t('prefs.clickMenu') },
        ]),
      ),
      h('section', { class: 'prefs-section' },
        h('h3', { text: t('prefs.appearance') }),
        selectRow('language', t('prefs.language'), null, [
          { value: 'auto', label: t('prefs.languageAuto') },
          ...store.languages.map((l) => ({ value: l.code, label: l.name })),
        ], String),
        segmentedRow('theme', t('prefs.theme'), null, [
          { value: 'system', label: t('prefs.themeSystem') },
          { value: 'light', label: t('prefs.themeLight') },
          { value: 'dark', label: t('prefs.themeDark') },
        ]),
      ),
    );
  }

  // ----------------------------------------------- learn modal (data-driven)
  const BLOCKS = {
    paragraphs: (b) => h('div', { class: 'block paragraphs' }, ...b.items.map((p) => h('p', { text: p }))),
    facts: (b) => h('dl', { class: 'block facts' }, ...b.items.map((f) => h('div', { class: 'fact' }, h('dt', { text: f.label }), h('dd', { text: f.value })))),
    cards: (b) => h('div', { class: 'block card-grid' }, ...b.items.map((c) => h('article', { class: 'card' },
      h('div', { class: 'card-icon', icon: c.icon }),
      h('h3', { text: c.title }),
      h('p', { text: c.text }),
      c.badge && h('div', { class: 'card-foot' }, h('span', { class: `badge badge-${c.badge.tone}`, text: c.badge.label })),
    ))),
    steps: (b) => h('div', { class: 'block steps' }, ...b.items.map((step, i) => h('article', { class: 'step' },
      h('span', { class: 'step-num', text: String(i + 1).padStart(2, '0') }),
      h('div', { class: 'card-icon', icon: step.icon }),
      h('h3', { text: step.title }),
      h('p', { text: step.text }),
    ))),
    callout: (b) => h('div', { class: 'block callout', icon: b.icon }, h('div', {}, b.title && h('strong', { text: b.title }), h('p', { text: b.text }))),
    gallery: (b) => h('div', { class: 'block gallery' }, ...b.items.map((img) => {
      const credit = t('ui.artBy', { author: img.credit.author, license: img.credit.license });
      return h('figure', { class: 'photo' },
        h('button', { class: 'photo-button', type: 'button', 'aria-label': img.caption, onclick: () => openLightbox(img, credit) },
          h('img', { src: img.src, alt: img.caption, loading: 'lazy', draggable: 'false' })),
        h('figcaption', {}, img.caption, h('button', { class: 'credit', type: 'button', text: credit, onclick: () => openLink(img.credit.url) })));
    })),
    links: (b) => h('ol', { class: 'block links' }, ...b.items.map((l) => h('li', {}, l.text, ' ',
      h('button', { class: 'link-button', type: 'button', text: l.url, onclick: () => openLink(l.url) })))),
  };

  function renderLearn() {
    const L = store.strings.learn;
    $('#learn-title').textContent = L.title;
    $('#learn-subtitle').textContent = L.subtitle;
    $('#learn-lead').textContent = L.lead;
    if (!learnTab || !L.tabs.some((tab) => tab.id === learnTab)) learnTab = L.tabs[0].id;
    $('#learn-tabs').setAttribute('aria-label', L.title);
    $('#learn-tabs').replaceChildren(...L.tabs.map((tab) => h('button', {
      class: 'tab', type: 'button', role: 'tab', id: `tab-${tab.id}`, 'aria-controls': `panel-${tab.id}`,
      icon: tab.icon, dataset: { tab: tab.id }, onclick: () => selectTab(tab.id),
    }, h('span', { text: tab.label }))));
    $('#learn-body').replaceChildren(...L.tabs.map((tab) => h('section', {
      class: 'tab-panel', role: 'tabpanel', id: `panel-${tab.id}`, 'aria-labelledby': `tab-${tab.id}`, tabindex: '0',
    },
    h('h3', { class: 'section-title', text: tab.heading }),
    tab.intro && h('p', { class: 'section-intro', text: tab.intro }),
    ...tab.blocks.map((block) => (BLOCKS[block.type] ? BLOCKS[block.type](block) : null)))));
    selectTab(learnTab);
  }

  function selectTab(id, { focus = false } = {}) {
    learnTab = id;
    $$('.tab').forEach((tab) => {
      const selected = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    $$('.tab-panel').forEach((panel) => { panel.hidden = panel.id !== `panel-${id}`; });
    $('#learn-body').scrollTop = 0;
  }

  function openLightbox(img, credit) {
    $('#lightbox-img').src = img.src;
    $('#lightbox-img').alt = img.caption;
    $('#lightbox-caption').textContent = img.caption;
    const creditButton = $('#lightbox-credit');
    creditButton.textContent = credit;
    creditButton.onclick = () => openLink(img.credit.url);
    openLayer($('#lightbox'));
  }

  // ------------------------------------------------------------ modal layers
  function openLayer(layer) {
    if (!layer.hidden) return;
    focusStack.push(document.activeElement);
    layer.hidden = false;
    syncLayerState();
    const target = $('.close-button', layer) || layer;
    requestAnimationFrame(() => target.focus());
  }

  function closeLayer(layer) {
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    syncLayerState();
    const previous = focusStack.pop();
    if (previous && document.contains(previous)) previous.focus();
  }

  // Drag regions are disabled while any dialog is open (.has-layer in styles.css).
  function syncLayerState() {
    document.documentElement.classList.toggle('has-layer', $$('.modal:not([hidden]), .lightbox:not([hidden])').length > 0);
  }

  function topLayer() {
    const open = $$('.lightbox:not([hidden]), .modal:not([hidden])');
    return open.find((l) => l.classList.contains('lightbox')) || open[open.length - 1] || null;
  }

  function openModal(id) {
    $$('.modal:not([hidden])').forEach((m) => { if (m.id !== id) closeLayer(m); });
    openLayer($(`#${id}`));
  }

  function navigate(view) {
    if (view === 'learn') openModal('learn-modal');
    else if (view === 'preferences') openModal('prefs-modal');
    else if (view === 'about') openModal('about-modal');
    else $$('.modal:not([hidden]), .lightbox:not([hidden])').forEach(closeLayer);
  }

  function trapFocus(event, layer) {
    const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', layer).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  // ------------------------------------------------------------------ events
  function bindEvents() {
    $('#orb').addEventListener('click', () => api.toggle());
    $('#example-option').addEventListener('change', (e) => api.updateSettings({ exampleOption: e.target.checked }));
    $('#show-at-startup').addEventListener('change', (e) => api.updateSettings({ showWindowOnLaunch: e.target.checked }));
    $('#open-prefs').addEventListener('click', () => openModal('prefs-modal'));
    $('#open-about').addEventListener('click', () => openModal('about-modal'));
    $('#open-learn').addEventListener('click', () => openModal('learn-modal'));
    $('#about-quit').addEventListener('click', () => api.quit());
    document.addEventListener('click', (event) => {
      const closer = event.target.closest('[data-close]');
      if (closer) closeLayer(closer.closest('.modal, .lightbox'));
    });
    $('#learn-tabs').addEventListener('keydown', (event) => {
      const ids = store.strings.learn.tabs.map((tab) => tab.id);
      const index = ids.indexOf(learnTab);
      const next = { ArrowRight: ids[(index + 1) % ids.length], ArrowLeft: ids[(index - 1 + ids.length) % ids.length], Home: ids[0], End: ids[ids.length - 1] }[event.key];
      if (next) {
        event.preventDefault();
        selectTab(next, { focus: true });
      }
    });
    document.addEventListener('keydown', (event) => {
      const layer = topLayer();
      if (event.key === 'Escape' && layer) {
        event.preventDefault();
        closeLayer(layer);
      } else if (event.key === 'Tab' && layer) {
        trapFocus(event, layer);
      } else if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        openModal('prefs-modal');
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'w' && !isMac()) {
        event.preventDefault();
        api.closeWindow();
      }
    });
  }

  init().catch((err) => console.error('[app] failed to start UI', err));
})();
