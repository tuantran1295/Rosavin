'use strict';

// English strings — plain data only (sent to the renderer over IPC).
// Every locale file must have exactly this shape (test/i18n.test.js).
// Replace the starter copy with your app's own words.
module.exports = {
  code: 'en',
  name: 'English',
  localeTag: 'en-US',

  app: { tagline: '__TAGLINE__' },

  durations: {
    indefinitely: 'Until I stop it',
    minute: '1 minute',
    minutes: '{n} minutes',
    hour: '1 hour',
    hours: '{n} hours',
    short: { indefinitely: '∞', m: '{n}m', h: '{n}h', hm: '{h}h{mm}' },
  },

  remaining: {
    long: { s: '{s} sec', m: '{m} min', hm: '{h} h {mm} min' },
    compact: { s: '{s}s', m: '{m}m', hm: '{h}h{mm}' },
  },

  tray: {
    statusOnTimed: '__APP_NAME__ is on — {remaining} left',
    statusOnIndefinite: '__APP_NAME__ is on',
    statusOff: '__APP_NAME__ is off',
    turnOn: 'Turn On',
    turnOff: 'Turn Off',
    turnOnFor: 'Turn On For',
    openWindow: 'Open __APP_NAME__…',
    learn: 'Learn More…',
    preferences: 'Preferences…',
    about: 'About __APP_NAME__',
    quit: 'Quit __APP_NAME__',
    tooltipOn: '__APP_NAME__ — on',
    tooltipOnTimed: '__APP_NAME__ — {remaining} left',
    tooltipOff: '__APP_NAME__ — off',
  },

  notifications: {
    finishedTitle: 'Session finished',
    finishedBody: 'Your {duration} session has ended.',
  },

  appMenu: {
    about: 'About __APP_NAME__',
    preferences: 'Preferences…',
    hide: 'Hide __APP_NAME__',
    hideOthers: 'Hide Others',
    showAll: 'Show All',
    quit: 'Quit __APP_NAME__',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    window: 'Window',
    minimize: 'Minimize',
    close: 'Close Window',
    help: 'Help',
    learn: 'Learn More',
  },

  ui: {
    statusOnTitle: 'Session running',
    statusOffTitle: 'Ready when you are',
    statusOnUntil: 'Until {time} · {remaining} left',
    statusOnIndefinite: 'Until you turn it off',
    statusOff: 'Click the button to start, or pick a duration below.',
    toggleOn: 'Start a session',
    toggleOff: 'Stop the session',
    toggleHint: 'Click to switch on or off',
    durationLabel: 'Run for',
    optionTitle: 'Example option',
    optionHint: 'Replace with a setting that matters for your app.',
    trayHintMac: '__APP_NAME__ lives in your menu bar. Click its icon to toggle, right-click for more.',
    trayHintWin: '__APP_NAME__ lives in the system tray. Click its icon to toggle, right-click for more.',
    preferences: 'Preferences',
    about: 'About',
    language: 'Language',
    heroKicker: 'Welcome',
    heroTitle: '__APP_NAME__',
    heroText: '__TAGLINE__',
    learnButton: 'Learn more',
    artBy: 'Illustration: {author} · {license}',
    close: 'Close',
    showAtStartup: 'Show this window at startup',
  },

  prefs: {
    title: 'Preferences',
    general: 'General',
    launchAtLogin: 'Start __APP_NAME__ at login',
    launchAtLoginNoteMac: 'macOS may ask you to allow it in System Settings › General › Login Items.',
    showWindowOnLaunch: 'Show the window at startup',
    defaultDuration: 'Default duration',
    defaultDurationHint: 'Used when you click the menu bar icon.',
    notifyWhenFinished: 'Notify me when a session ends',
    exampleOption: 'Example option',
    exampleOptionHint: 'Settings are validated and saved instantly.',
    menuBarMac: 'Menu bar',
    menuBarWin: 'System tray',
    showCountdown: 'Show time remaining next to the icon',
    clickAction: 'Clicking the icon',
    clickToggle: 'Turns it on/off',
    clickMenu: 'Opens the menu',
    clickHint: 'Right-click (or ⌘-click on Mac) always opens the menu.',
    appearance: 'Appearance & language',
    language: 'Language',
    languageAuto: 'System default',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
  },

  about: {
    title: 'About __APP_NAME__',
    version: 'Version {version}',
    description: '__TAGLINE__',
    builtWith: 'Built with Electron {electron} · Chromium {chrome}',
    license: 'Released under the MIT License.',
    credits: 'Fonts: Be Vietnam Pro and Fraunces (SIL Open Font License).',
  },

  learn: {
    title: '__APP_NAME__',
    subtitle: 'Design system · Menu bar · Preferences',
    lead: 'A polished starting point: replace this content with the story of your app.',
    tabs: [
      {
        id: 'overview',
        icon: 'sprout',
        label: 'Overview',
        heading: 'Start from something beautiful',
        intro: 'Everything in this window is data-driven: edit src/shared/locales to change the words, and styles.css to change the look.',
        blocks: [
          {
            type: 'paragraphs',
            items: [
              'The window pairs a calm control panel with a rich hero area. One signature control, the big round button, carries the main action and animates between states.',
              'Light and dark themes are designed separately with CSS custom properties, the fonts are bundled, and every string exists in English and Vietnamese.',
            ],
          },
          {
            type: 'facts',
            items: [
              { label: 'Window', value: '980 × 680, light and dark' },
              { label: 'Menu bar', value: 'Template icons, countdown, native menu' },
              { label: 'Languages', value: 'English and Vietnamese' },
              { label: 'Quality', value: 'Unit tests, Playwright E2E, screenshots' },
            ],
          },
        ],
      },
      {
        id: 'features',
        icon: 'sparkle',
        label: 'Features',
        heading: 'What is included',
        intro: 'Each card is one block item; the badge tone is green, gold or gray.',
        blocks: [
          {
            type: 'cards',
            items: [
              { icon: 'palette', title: 'Design tokens', text: 'Colours, radii and shadows as CSS variables, tuned for light and dark.', badge: { label: 'Core', tone: 'green' } },
              { icon: 'layers', title: 'Modals & tabs', text: 'Accessible dialogs with focus trapping, tabs with arrow-key navigation.', badge: { label: 'Core', tone: 'green' } },
              { icon: 'bell', title: 'Menu bar & tray', text: 'Template icons, click to toggle, right-click menu, live countdown.', badge: { label: 'Native', tone: 'gold' } },
              { icon: 'gear', title: 'Preferences', text: 'Validated settings saved atomically, start at login, theme and language.', badge: { label: 'Core', tone: 'green' } },
              { icon: 'shield', title: 'Secure by default', text: 'Sandboxed renderer, strict CSP, validated IPC, no remote content.', badge: { label: 'Security', tone: 'gold' } },
              { icon: 'check', title: 'Tested', text: 'node:test unit tests and Playwright end-to-end checks.', badge: { label: 'Quality', tone: 'gray' } },
            ],
          },
        ],
      },
      {
        id: 'how',
        icon: 'bolt',
        label: 'How it works',
        heading: 'From idea to installer',
        intro: 'The same loop works for any app.',
        blocks: [
          {
            type: 'steps',
            items: [
              { icon: 'palette', title: 'Brief', text: 'Pick a concept, a palette, fonts and one signature interaction.' },
              { icon: 'sparkle', title: 'Brand', text: 'Draw the mark in SVG and run npm run assets for every icon size.' },
              { icon: 'layers', title: 'Build', text: 'Replace the example session with your feature and copy.' },
              { icon: 'check', title: 'Ship', text: 'Screenshot, test, package with electron-builder and verify.' },
            ],
          },
          {
            type: 'callout',
            icon: 'info',
            title: 'Look at it',
            text: 'Run npm run screenshots after every visual change and review the images in both themes and every language.',
          },
        ],
      },
      {
        id: 'gallery',
        icon: 'image',
        label: 'Gallery',
        heading: 'Gallery',
        intro: 'Click an image to enlarge it. Credit every image you did not make yourself.',
        blocks: [
          {
            type: 'gallery',
            items: [
              { src: 'images/hero.svg', caption: 'Hero illustration (replace with your own art or a licensed photo).', credit: { author: 'Starter', license: 'MIT', url: '' } },
              { src: 'images/art-dawn.svg', caption: 'A dawn variant of the same landscape.', credit: { author: 'Starter', license: 'MIT', url: '' } },
              { src: 'images/art-dusk.svg', caption: 'A dusk variant for dark moods.', credit: { author: 'Starter', license: 'MIT', url: '' } },
            ],
          },
        ],
      },
    ],
  },
};
