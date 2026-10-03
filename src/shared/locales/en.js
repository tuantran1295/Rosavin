'use strict';

// English strings. Plain data only (no functions) so the dictionary can be sent
// to the renderer over IPC. Placeholders use {name}.
module.exports = {
  code: 'en',
  name: 'English',

  app: {
    name: 'Rosavin',
    tagline: 'Stay awake, naturally.',
  },

  durations: {
    indefinitely: 'Indefinitely',
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
    statusOnTimed: 'Rosavin is on — {remaining} left',
    statusOnIndefinite: 'Rosavin is on — until you turn it off',
    statusOff: 'Rosavin is off — your computer can sleep',
    turnOn: 'Turn On',
    turnOff: 'Turn Off',
    turnOnFor: 'Turn On For',
    keepScreenOn: 'Keep Screen On',
    openWindow: 'Open Rosavin…',
    benefits: 'Rhodiola Rosea Benefits…',
    preferences: 'Preferences…',
    about: 'About Rosavin',
    quit: 'Quit Rosavin',
    tooltipOn: 'Rosavin — keeping your computer awake',
    tooltipOnTimed: 'Rosavin — awake for {remaining} more',
    tooltipOff: 'Rosavin — sleep allowed',
  },

  notifications: {
    finishedTitle: 'Rosavin is off',
    finishedBody: 'Your {duration} session has ended. Your computer can sleep normally again.',
    stillRunningTitle: 'Rosavin is still running',
    stillRunningMac: 'Look for the sunflower icon in the menu bar. Click it to turn Rosavin on or off.',
    stillRunningWin: 'Look for the sunflower icon in the system tray (you may need to click ^). Click it to turn Rosavin on or off.',
  },

  appMenu: {
    about: 'About Rosavin',
    preferences: 'Preferences…',
    hide: 'Hide Rosavin',
    hideOthers: 'Hide Others',
    showAll: 'Show All',
    quit: 'Quit Rosavin',
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
    benefits: 'Rhodiola Rosea Benefits',
  },

  ui: {
    statusOnTitle: 'Staying awake',
    statusOffTitle: 'Sleeping as usual',
    statusOnUntil: 'Until {time} · {remaining} left',
    statusOnIndefinite: 'Until you turn it off',
    statusOffMac: 'Your Mac can sleep, dim the screen and start the screen saver normally.',
    statusOffWin: 'Your PC can sleep, dim the screen and start the screen saver normally.',
    toggleOn: 'Turn Rosavin on',
    toggleOff: 'Turn Rosavin off',
    toggleHint: 'Click the sunflower to switch on or off',
    durationLabel: 'Keep awake for',
    keepScreenOn: 'Keep screen on',
    keepScreenOnHint: 'No dimming or display sleep. Turn off to keep only the system awake.',
    trayHintMac: 'Rosavin lives in your menu bar. Click the sunflower icon to toggle, right-click for more options.',
    trayHintWin: 'Rosavin lives in the system tray. Click the sunflower icon to toggle, right-click for more options.',
    preferences: 'Preferences',
    about: 'About',
    quit: 'Quit',
    language: 'Language',
    heroKicker: 'Meet the golden root',
    heroTitle: 'Rhodiola rosea',
    heroText: 'A hardy Arctic herb traditionally used to fight fatigue and stay sharp under pressure — and the plant behind the name Rosavin.',
    benefitsButton: 'Discover the benefits',
    photoBy: 'Photo: {author} · {license}',
    close: 'Close',
    showAtStartup: 'Show this window at startup',
    openSource: 'Source',
    license: 'License',
  },

  prefs: {
    title: 'Preferences',
    general: 'General',
    launchAtLogin: 'Start Rosavin at login',
    launchAtLoginNoteMac: 'macOS may ask you to allow Rosavin in System Settings › General › Login Items.',
    activateOnLaunch: 'Turn on when Rosavin starts',
    activateOnLaunchHint: 'Keeps your computer awake as soon as Rosavin opens, using the default duration.',
    showWindowOnLaunch: 'Show the Rosavin window at startup',
    defaultDuration: 'Default duration',
    defaultDurationHint: 'Used when you click the icon or turn Rosavin on without choosing a time.',
    notifyWhenFinished: 'Notify me when a timer ends',
    menuBarMac: 'Menu bar',
    menuBarWin: 'System tray',
    showCountdown: 'Show time remaining next to the icon',
    clickAction: 'Clicking the icon',
    clickToggle: 'Turns Rosavin on/off',
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
    title: 'About Rosavin',
    version: 'Version {version}',
    description: 'Rosavin keeps your Mac or Windows PC awake for as long as you need: no more dimming screens during presentations, long downloads, builds or late-night reading.',
    builtWith: 'Built with Electron {electron} · Chromium {chrome}',
    license: 'Free and open source under the MIT License.',
    credits: 'Photos by Wikimedia Commons contributors (credited in the Gallery). Fonts: Be Vietnam Pro and Fraunces (SIL Open Font License).',
    disclaimer: 'Health information in Rosavin is for education only and is not medical advice.',
  },

  benefits: {
    title: 'Rhodiola rosea',
    aka: 'Golden root · Arctic root · Rose root',
    lead: 'A tough little succulent from the top of the world, and one of the most researched herbs for fatigue and stress.',
    tabs: {
      overview: 'Overview',
      benefits: 'Benefits',
      awake: 'How it keeps you awake',
      safety: 'Use it wisely',
      gallery: 'Gallery',
      sources: 'Sources',
    },

    overview: {
      heading: 'Meet the golden root',
      paragraphs: [
        'Rhodiola rosea is a perennial succulent of the stonecrop family (Crassulaceae). It thrives where few plants can: on windswept Arctic coasts, rocky cliffs and high mountain slopes across Europe, Asia and North America.',
        'For centuries, people in Scandinavia, Russia and the Caucasus have used its golden, rose-scented root to push through fatigue, endure harsh winters and stay sharp under pressure. The Greek physician Dioscorides described it as early as the 1st century.',
        'Today, rhodiola is best known as an adaptogen: a plant thought to help the body resist and recover from physical, mental and environmental stress. The European Medicines Agency recognises it as a traditional herbal medicine for the temporary relief of stress symptoms such as fatigue and a feeling of weakness.',
      ],
      facts: [
        { label: 'Family', value: 'Crassulaceae (stonecrop family)' },
        { label: 'Grows in', value: 'Cold Arctic coasts and mountains of the Northern Hemisphere' },
        { label: 'Part used', value: 'Root and rhizome' },
        { label: 'Signature compounds', value: 'Rosavins (rosavin, rosarin, rosin), salidroside, tyrosol' },
        { label: 'Why "rose root"?', value: 'The freshly cut root smells like roses' },
        { label: 'Why "Rosavin"?', value: 'Rosavin is the compound found almost only in R. rosea, so it is used to identify genuine extracts.' },
      ],
    },

    benefitsSection: {
      heading: 'Key health benefits',
      intro: 'What research suggests so far. Each card shows how strong the evidence is; numbers link to the sources.',
      levels: { promising: 'Promising evidence', some: 'Some evidence', early: 'Early research' },
      items: [
        {
          icon: 'battery',
          title: 'Less fatigue, more energy',
          text: 'Controlled trials report less mental fatigue in people under stress: physicians on night duty, students during exams and adults with stress-related fatigue or burnout.',
          level: 'promising',
          refs: [2, 4, 5, 6, 7],
        },
        {
          icon: 'focus',
          title: 'Sharper focus under pressure',
          text: 'Small studies found better attention, concentration and capacity for mental work during demanding, sleep-deprived periods.',
          level: 'some',
          refs: [2, 3, 5],
        },
        {
          icon: 'shield',
          title: 'Stress resilience',
          text: 'As an adaptogen, it appears to balance the body\'s stress-response system and was linked to a healthier cortisol response and fewer stress symptoms.',
          level: 'some',
          refs: [1, 5, 13],
        },
        {
          icon: 'sun',
          title: 'Brighter mood',
          text: 'Trials suggest a modest benefit for mild-to-moderate low mood. In one study it worked less strongly than a standard antidepressant but caused fewer side effects.',
          level: 'early',
          refs: [8, 9],
        },
        {
          icon: 'activity',
          title: 'Physical endurance',
          text: 'Some studies report better endurance and less perceived effort during exercise; others found no effect, so results are mixed.',
          level: 'early',
          refs: [10, 11, 15],
        },
        {
          icon: 'leaf',
          title: 'Cell protection',
          text: 'Lab and animal studies show antioxidant and protective effects of salidroside on brain and muscle cells. Interesting, but not yet proven in people.',
          level: 'early',
          refs: [1, 14],
        },
      ],
    },

    awakeSection: {
      heading: 'How it helps you stay awake',
      intro: 'Rhodiola is not a stimulant in the usual sense. Instead of pushing your nervous system into overdrive, it seems to help your body handle the stress that drains your energy, so you feel more alert without the jittery crash of strong stimulants.',
      steps: [
        {
          icon: 'wave',
          title: 'Calms the stress alarm',
          text: 'It modulates the hypothalamic–pituitary–adrenal (HPA) axis and stress messengers such as cortisol, so less of your energy is burned by stress.',
        },
        {
          icon: 'brain',
          title: 'Supports brain messengers',
          text: 'It influences serotonin, dopamine and norepinephrine. Lab studies show it can inhibit MAO-A and MAO-B, the enzymes that break these messengers down.',
        },
        {
          icon: 'bolt',
          title: 'Fuels your cells',
          text: 'Animal studies show more ATP, the energy currency of cells, in muscle mitochondria and faster recovery after exertion.',
        },
        {
          icon: 'shield',
          title: 'Builds stress resistance',
          text: 'It switches on protective proteins such as heat-shock protein Hsp70 that help cells stay resilient under strain, a hallmark of adaptogens.',
        },
      ],
      resultTitle: 'The result in studies',
      resultText: 'Less mental fatigue and better performance during demanding, sleep-deprived stretches, as seen in physicians on night duty and in military cadets working under fatigue.',
      compoundsHeading: 'The molecules behind it',
      compounds: [
        { name: 'Rosavins', text: 'Rosavin, rosarin and rosin are cinnamyl-alcohol glycosides found almost only in R. rosea. They are the marker of a genuine extract, and this app\'s namesake.' },
        { name: 'Salidroside', text: 'Also called rhodioloside, it is a phenylethanoid glycoside with anti-fatigue and antioxidant activity in studies.' },
        { name: 'Tyrosol', text: 'A phenolic antioxidant (also found in olive oil) that works together with salidroside.' },
      ],
      standardized: 'Quality extracts are often standardised to about 3% rosavins and 1% salidroside, the ratio found naturally in the root.',
      reminder: 'Rhodiola can\'t replace sleep. Like Rosavin, use it for the moments when you truly need to stay alert, then rest.',
    },

    safetySection: {
      heading: 'Use it wisely',
      intro: 'Rhodiola is generally well tolerated in short-term studies (up to about 12 weeks), but it is still an active herb.',
      cards: [
        {
          icon: 'clock',
          title: 'How it was used in studies',
          items: [
            'Most studies used about 200–600 mg a day of a standardised root extract.',
            'Take it in the morning or early afternoon, ideally before a meal. It can be energising and may disturb sleep if taken late.',
            'Some people notice less fatigue within days; many studies lasted 2–8 weeks.',
          ],
        },
        {
          icon: 'alert',
          title: 'Possible side effects',
          items: [
            'Dizziness, headache or trouble sleeping.',
            'Dry mouth or, less often, extra saliva.',
            'Restlessness or an upset stomach. These are usually mild and fade when you stop.',
          ],
        },
        {
          icon: 'stethoscope',
          title: 'Talk to a doctor first if you…',
          items: [
            'are pregnant or breastfeeding (safety is unknown).',
            'have bipolar disorder: its activating effect could trigger mania.',
            'take antidepressants, stimulants, or blood-pressure, diabetes, blood-thinning or immune-suppressing medicines (an interaction with losartan has been reported).',
          ],
        },
        {
          icon: 'check',
          title: 'Choose quality',
          items: [
            'Look for Rhodiola rosea root extract standardised for rosavins and salidroside.',
            'Prefer brands with independent testing. Studies of commercial products found many were mislabelled, contained other Rhodiola species, or had less than the claimed amount.',
          ],
        },
      ],
      disclaimer: 'This content is for general education only and is not medical advice. Rhodiola supplements are not approved to diagnose, treat, cure or prevent any disease. Always ask a qualified healthcare professional before starting a supplement, especially if you are pregnant, nursing, taking medication or living with a health condition.',
    },

    gallerySection: {
      heading: 'Gallery',
      intro: 'Rhodiola rosea in the wild, from Norwegian sea cliffs to the Japanese Alps. Click a photo to enlarge it.',
      captions: {
        'coast-norway': 'A golden-root cushion on the rocky coast of Norway.',
        'mountain-habitat': 'Alpine meadows below Mount Yari in the Japanese Alps.',
        'male-flowers': 'Male flowers: dense, sunny clusters of tiny stars.',
        'female-fruits': 'Female plants turn crimson as their fruits ripen.',
        'star-rosette': 'A star-shaped rosette of blue-green, succulent leaves.',
        'dried-root': 'The dried root, the part used in teas and extracts.',
        'rosavin-molecule': 'Rosavin, the signature compound of R. rosea.',
        'salidroside-molecule': 'Salidroside, studied for its anti-fatigue effects.',
      },
      credit: 'Photo: {author} · {license}',
      viewSource: 'View source',
    },

    sourcesSection: {
      heading: 'Sources',
      intro: 'Peer-reviewed studies and official monographs used for this summary.',
    },
  },
};
