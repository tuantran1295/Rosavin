// Rosavin renderer. Runs sandboxed; talks to the main process via window.rosavin (preload.js).
(function () {
  'use strict';

  const api = window.rosavin;
  const { icon } = window.RosavinIcons;
  const Time = window.RosavinTime;
  const RING_LENGTH = 2 * Math.PI * 100;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const store = {
    state: null,
    settings: null,
    strings: null,
    locale: 'en',
    platform: 'darwin',
    version: '',
    versions: {},
    durations: { presets: [], quick: [] },
    images: [],
    sources: [],
    languages: [],
  };
  let countdown = null;
  let benefitsTab = 'overview';
  const focusStack = [];

  // ---------------------------------------------------------------- helpers
  function t(key, vars) {
    const value = key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), store.strings);
    if (typeof value !== 'string') return key;
    return vars ? Time.template(value, vars) : value;
  }

  /** Tiny DOM builder: h('p', { class: 'x', text: 'hi' }, child…). Text is always set safely. */
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

  const imageById = (id) => store.images.find((img) => img.id === id);
  const openLink = (url) => url && api.openExternal(url);
  const isMac = () => store.platform === 'darwin';

  // ------------------------------------------------------------------- boot
  async function init() {
    const snapshot = await api.getSnapshot();
    Object.assign(store, {
      state: snapshot.state,
      settings: snapshot.settings,
      strings: snapshot.strings,
      locale: snapshot.locale,
      platform: snapshot.platform,
      version: snapshot.version,
      versions: snapshot.versions,
      durations: snapshot.durations,
      images: snapshot.images,
      sources: snapshot.sources,
      languages: snapshot.languages,
    });
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
    const hero = imageById('hero-golden-flowers');
    if (hero) $('#hero-credit').textContent = t('ui.photoBy', { author: hero.author, license: hero.license });
    $('#about-version').textContent = t('about.version', { version: store.version });
    $('#about-built').textContent = t('about.builtWith', { electron: store.versions.electron, chrome: store.versions.chrome });

    renderChips();
    renderLanguageSwitch();
    renderPrefs();
    renderBenefits();
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
      sub.textContent = t(isMac() ? 'ui.statusOffMac' : 'ui.statusOffWin');
      ring.style.strokeDashoffset = String(RING_LENGTH);
      return;
    }
    if (!s.endsAt) {
      sub.textContent = t('ui.statusOnIndefinite');
      ring.style.strokeDashoffset = '0';
      return;
    }
    const remaining = Math.max(0, s.endsAt - Date.now());
    const total = s.durationMinutes * 60_000;
    sub.textContent = t('ui.statusOnUntil', {
      time: Time.formatClock(s.endsAt, store.locale),
      remaining: Time.formatRemaining(remaining, store.strings, 'long'),
    });
    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - Math.min(1, remaining / total)));
  }

  function renderChips() {
    const wrap = $('#chips');
    wrap.replaceChildren(
      ...store.durations.quick.map((minutes) =>
        h('button', {
          class: minutes === 0 ? 'chip chip-infinity' : 'chip',
          type: 'button',
          title: Time.formatDuration(minutes, store.strings),
          'aria-label': Time.formatDuration(minutes, store.strings),
          dataset: { minutes: String(minutes) },
          text: Time.formatDurationShort(minutes, store.strings),
          onclick: () => {
            const s = store.state;
            if (s.active && s.durationMinutes === minutes) api.deactivate();
            else api.activate(minutes);
          },
        }),
      ),
    );
  }

  function renderLanguageSwitch() {
    const wrap = $('#lang-switch');
    wrap.replaceChildren(
      ...store.languages.map((lang) =>
        h('button', {
          type: 'button',
          lang: lang.code,
          title: lang.name,
          'aria-label': lang.name,
          dataset: { lang: lang.code },
          text: lang.code.toUpperCase(),
          onclick: () => api.updateSettings({ language: lang.code }),
        }),
      ),
    );
  }

  function renderSettings() {
    const s = store.settings;
    $('#keep-screen-on').checked = s.keepScreenOn;
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
    const body = $('#prefs-body');
    const durationOptions = store.durations.presets.map((m) => ({ value: String(m), label: Time.formatDuration(m, store.strings) }));

    const switchRow = (key, label, hint) =>
      h('label', { class: 'pref-row' },
        h('span', { class: 'pref-label' }, h('span', { text: label }), hint && h('span', { class: 'pref-hint', text: hint })),
        h('input', {
          class: 'switch',
          type: 'checkbox',
          role: 'switch',
          dataset: { setting: key },
          onchange: (e) => api.updateSettings({ [key]: e.target.checked }),
        }),
      );

    const selectRow = (key, label, hint, options, parse) => {
      const id = `pref-${key}`;
      return h('div', { class: 'pref-row' },
        h('label', { class: 'pref-label', for: id }, h('span', { text: label }), hint && h('span', { class: 'pref-hint', text: hint })),
        h('select', {
          class: 'select',
          id,
          dataset: { setting: key },
          onchange: (e) => api.updateSettings({ [key]: parse(e.target.value) }),
        }, ...options.map((o) => h('option', { value: o.value, text: o.label }))),
      );
    };

    const segmentedRow = (key, label, hint, options) =>
      h('div', { class: 'pref-row' },
        h('span', { class: 'pref-label' }, h('span', { text: label }), hint && h('span', { class: 'pref-hint', text: hint })),
        h('div', { class: 'segmented', role: 'group', 'aria-label': label, dataset: { setting: key } },
          ...options.map((o) => h('button', {
            type: 'button',
            dataset: { value: o.value },
            text: o.label,
            onclick: () => api.updateSettings({ [key]: o.value }),
          })),
        ),
      );

    body.replaceChildren(
      h('section', { class: 'prefs-section' },
        h('h3', { text: t('prefs.general') }),
        switchRow('launchAtLogin', t('prefs.launchAtLogin'), isMac() ? t('prefs.launchAtLoginNoteMac') : null),
        switchRow('activateOnLaunch', t('prefs.activateOnLaunch')),
        switchRow('showWindowOnLaunch', t('prefs.showWindowOnLaunch')),
        selectRow('defaultDuration', t('prefs.defaultDuration'), t('prefs.defaultDurationHint'), durationOptions, Number),
        switchRow('notifyWhenFinished', t('prefs.notifyWhenFinished')),
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

  // ---------------------------------------------------------- benefits modal
  const TABS = [
    ['overview', 'sprout'],
    ['benefits', 'leaf'],
    ['awake', 'eye'],
    ['safety', 'shield'],
    ['gallery', 'image'],
    ['sources', 'book'],
  ];

  function renderBenefits() {
    const b = store.strings.benefits;
    $('#benefits-title').textContent = b.title;
    $('#benefits-aka').textContent = b.aka;
    $('#benefits-lead').textContent = b.lead;

    const tablist = $('#benefits-tabs');
    tablist.setAttribute('aria-label', b.title);
    tablist.replaceChildren(
      ...TABS.map(([id, iconName]) =>
        h('button', {
          class: 'tab',
          type: 'button',
          role: 'tab',
          id: `tab-${id}`,
          'aria-controls': `panel-${id}`,
          icon: iconName,
          dataset: { tab: id },
          onclick: () => selectTab(id),
        }, h('span', { text: b.tabs[id] })),
      ),
    );

    const builders = { overview: buildOverview, benefits: buildBenefitCards, awake: buildAwake, safety: buildSafety, gallery: buildGallery, sources: buildSources };
    $('#benefits-body').replaceChildren(
      ...TABS.map(([id]) => h('section', { class: 'tab-panel', role: 'tabpanel', id: `panel-${id}`, 'aria-labelledby': `tab-${id}`, tabindex: '0' }, builders[id](b))),
    );
    selectTab(benefitsTab, { focus: false });
  }

  function selectTab(id, { focus = false } = {}) {
    benefitsTab = id;
    $$('.tab').forEach((tab) => {
      const selected = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    $$('.tab-panel').forEach((panel) => { panel.hidden = panel.id !== `panel-${id}`; });
    $('#benefits-body').scrollTop = 0;
  }

  function buildOverview(b) {
    const o = b.overview;
    return h('div', {},
      h('h3', { class: 'section-title', text: o.heading }),
      h('div', { class: 'overview' },
        h('div', { class: 'overview-text' },
          ...o.paragraphs.map((p) => h('p', { text: p })),
          h('div', { class: 'callout', icon: 'flask' }, h('div', {}, h('strong', { text: o.evidenceTitle }), h('p', { text: o.evidenceNote }))),
        ),
        h('dl', { class: 'facts' }, ...o.facts.map((f) => h('div', { class: 'fact' }, h('dt', { text: f.label }), h('dd', { text: f.value })))),
      ),
    );
  }

  function refButtons(refs) {
    return h('span', { class: 'refs' }, ...refs.map((n) => h('button', {
      class: 'ref',
      type: 'button',
      title: store.sources.find((s) => s.id === n)?.text,
      text: String(n),
      onclick: () => showSource(n),
    })));
  }

  function showSource(n) {
    selectTab('sources');
    const item = $(`#source-${n}`);
    if (!item) return;
    item.scrollIntoView({ block: 'center' });
    item.classList.remove('is-flash');
    void item.offsetWidth;
    item.classList.add('is-flash');
  }

  function buildBenefitCards(b) {
    const s = b.benefitsSection;
    return h('div', {},
      h('h3', { class: 'section-title', text: s.heading }),
      h('p', { class: 'section-intro', text: s.intro }),
      h('div', { class: 'card-grid' },
        ...s.items.map((item) => h('article', { class: 'card' },
          h('div', { class: 'card-icon', icon: item.icon }),
          h('h3', { text: item.title }),
          h('p', { text: item.text }),
          h('div', { class: 'card-foot' }, h('span', { class: `badge badge-${item.level}`, text: s.levels[item.level] }), refButtons(item.refs)),
        )),
      ),
    );
  }

  function buildAwake(b) {
    const a = b.awakeSection;
    const molecule = imageById('rosavin-molecule');
    return h('div', {},
      h('h3', { class: 'section-title', text: a.heading }),
      h('p', { class: 'section-intro', text: a.intro }),
      h('div', { class: 'steps' },
        ...a.steps.map((step, i) => h('article', { class: 'step' },
          h('span', { class: 'step-num', text: String(i + 1).padStart(2, '0') }),
          h('div', { class: 'card-icon', icon: step.icon }),
          h('h3', { text: step.title }),
          h('p', { text: step.text }),
        )),
      ),
      h('div', { class: 'callout result', icon: 'bolt' }, h('div', {}, h('strong', { text: a.resultTitle }), h('p', { text: a.resultText }))),
      h('div', { class: 'compounds' },
        molecule && h('figure', { class: 'molecule' },
          h('img', { src: molecule.file, alt: b.gallerySection.captions['rosavin-molecule'], loading: 'lazy' }),
          h('figcaption', {}, b.gallerySection.captions['rosavin-molecule'], ' ', h('button', { class: 'credit', type: 'button', text: Time.template(b.gallerySection.credit, { author: molecule.author, license: molecule.license }), onclick: () => openLink(molecule.source) })),
        ),
        h('div', {},
          h('h3', { class: 'section-title', text: a.compoundsHeading }),
          h('ul', { class: 'compound-list' }, ...a.compounds.map((c) => h('li', {}, h('strong', { text: c.name }), c.text))),
          h('p', { class: 'note', text: a.standardized }),
        ),
      ),
      h('div', { class: 'callout reminder', icon: 'eye' }, h('p', { text: a.reminder })),
    );
  }

  function buildSafety(b) {
    const s = b.safetySection;
    return h('div', {},
      h('h3', { class: 'section-title', text: s.heading }),
      h('p', { class: 'section-intro', text: s.intro }),
      h('div', { class: 'safety-grid' },
        ...s.cards.map((card) => h('article', { class: 'card safety-card' },
          h('div', { class: 'card-icon', icon: card.icon }),
          h('h3', { text: card.title }),
          h('ul', {}, ...card.items.map((item) => h('li', { text: item }))),
        )),
      ),
      h('p', { class: 'disclaimer', text: s.disclaimer }),
    );
  }

  function buildGallery(b) {
    const g = b.gallerySection;
    const photos = store.images.filter((img) => img.gallery);
    return h('div', {},
      h('h3', { class: 'section-title', text: g.heading }),
      h('p', { class: 'section-intro', text: g.intro }),
      h('div', { class: 'gallery' },
        ...photos.map((img) => {
          const caption = g.captions[img.id] || '';
          const credit = Time.template(g.credit, { author: img.author, license: img.license });
          return h('figure', { class: 'photo' },
            h('button', { class: 'photo-button', type: 'button', 'aria-label': caption, onclick: () => openLightbox(img, caption, credit) },
              h('img', { src: img.file, alt: caption, loading: 'lazy', draggable: 'false' })),
            h('figcaption', {}, caption, h('button', { class: 'credit', type: 'button', text: credit, title: g.viewSource, onclick: () => openLink(img.source) })),
          );
        }),
      ),
    );
  }

  function buildSources(b) {
    const s = b.sourcesSection;
    return h('div', {},
      h('h3', { class: 'section-title', text: s.heading }),
      h('p', { class: 'section-intro', text: s.intro }),
      h('ol', { class: 'sources' },
        ...store.sources.map((src) => h('li', { id: `source-${src.id}`, value: String(src.id) },
          src.text, ' ', h('button', { class: 'link-button', type: 'button', text: src.url, onclick: () => openLink(src.url) }))),
      ),
    );
  }

  // ---------------------------------------------------------------- lightbox
  function openLightbox(img, caption, credit) {
    $('#lightbox-img').src = img.file;
    $('#lightbox-img').alt = caption;
    $('#lightbox-caption').textContent = caption;
    const creditButton = $('#lightbox-credit');
    creditButton.textContent = `${credit} · ${t('benefits.gallerySection.viewSource')}`;
    creditButton.onclick = () => openLink(img.source);
    openLayer($('#lightbox'));
  }

  // ------------------------------------------------------------ modal layers
  function openLayer(layer) {
    if (!layer.hidden) return;
    focusStack.push(document.activeElement);
    layer.hidden = false;
    const target = $('.close-button', layer) || layer;
    requestAnimationFrame(() => target.focus());
  }

  function closeLayer(layer) {
    if (layer.hidden) return;
    layer.hidden = true;
    const previous = focusStack.pop();
    if (previous && document.contains(previous)) previous.focus();
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
    if (view === 'benefits') openModal('benefits-modal');
    else if (view === 'preferences') openModal('prefs-modal');
    else if (view === 'about') openModal('about-modal');
    else $$('.modal:not([hidden]), .lightbox:not([hidden])').forEach(closeLayer);
  }

  function trapFocus(event, layer) {
    const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', layer)
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  // ------------------------------------------------------------------ events
  function bindEvents() {
    $('#orb').addEventListener('click', () => api.toggle());
    $('#keep-screen-on').addEventListener('change', (e) => api.updateSettings({ keepScreenOn: e.target.checked }));
    $('#show-at-startup').addEventListener('change', (e) => api.updateSettings({ showWindowOnLaunch: e.target.checked }));
    $('#open-prefs').addEventListener('click', () => openModal('prefs-modal'));
    $('#open-about').addEventListener('click', () => openModal('about-modal'));
    $('#open-benefits').addEventListener('click', () => {
      selectTab('overview');
      openModal('benefits-modal');
    });
    $('#hero-credit').addEventListener('click', () => openLink(imageById('hero-golden-flowers')?.source));
    $('#about-quit').addEventListener('click', () => api.quit());

    document.addEventListener('click', (event) => {
      const closer = event.target.closest('[data-close]');
      if (closer) closeLayer(closer.closest('.modal, .lightbox'));
    });

    $('#benefits-tabs').addEventListener('keydown', (event) => {
      const ids = TABS.map(([id]) => id);
      const index = ids.indexOf(benefitsTab);
      let next = null;
      if (event.key === 'ArrowRight') next = ids[(index + 1) % ids.length];
      else if (event.key === 'ArrowLeft') next = ids[(index - 1 + ids.length) % ids.length];
      else if (event.key === 'Home') next = ids[0];
      else if (event.key === 'End') next = ids[ids.length - 1];
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

  init().catch((err) => console.error('[rosavin] failed to start UI', err));
})();
