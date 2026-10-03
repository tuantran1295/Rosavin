---
name: beautiful-electron-app
description: Build polished, beautiful Electron desktop apps for macOS and Windows — a branded window with design tokens and separately designed light/dark themes, one signature animated control, elegant modals, tabs and preferences, generated logo/app/tray icons, a secure main/preload/renderer architecture, multi-language UI, Playwright end-to-end tests with framed screenshots, and electron-builder DMG/installer packaging that is verified before release. Ships a runnable starter app and a scaffold script. Use this skill whenever the user wants to create, redesign or polish an Electron app, a macOS menu bar or Windows system-tray utility, or any cross-platform desktop app built with web tech, or asks for a "beautiful", "premium" or "impressive" desktop UI, an app icon / tray icon set, or a DMG or installer for such an app — even if they never say "Electron".
---

# Beautiful Electron apps

This skill takes an app idea to a polished, tested, packaged desktop app whose UI looks designed rather than assembled. It bundles a working starter (`assets/starter/`) that already has the design system, the secure architecture, a tray/menu bar integration, preferences, two languages, tests, screenshot tooling and packaging config, so the effort goes into the product's own idea, brand and feature instead of boilerplate.

## What "beautiful" means here

These principles are what separate a premium-feeling desktop app from a generic one. Keep them in mind at every step; they explain most of the concrete rules below.

- **One idea, expressed everywhere.** A concept (a metaphor) drives the name, the symbol, the palette, the motion and the microcopy. A sunflower that "wakes up" for a keep-awake app is one idea; a generic toggle is none.
- **Restraint.** A calm canvas, one brand hue, one warm accent gradient. Colour is spent on the few things that matter (the signature control, the primary action, state).
- **Real typography.** Bundle a display face and a UI face (SIL OFL fonts) that cover every language you ship. Use tabular numbers for anything that ticks.
- **One signature interaction.** A single control that carries the main action and visibly changes state: art cross-fades and blooms, a progress ring drains, a glow breathes. Everything else stays quiet.
- **Depth without clutter.** Soft layered shadows, glows and gradient scrims instead of borders and boxes.
- **Both themes designed.** Dark mode gets its own tokens, not an inversion.
- **Native manners.** macOS `hiddenInset` title bar with drag regions and a traffic-light-safe zone, native tray menus, no text selection on chrome, `cursor: default`, keyboard and screen-reader support.
- **Proof by looking.** Every visual change is captured with real screenshots and inspected, in every theme and language, before it is called done.

## Workflow

Work through these phases in order. Each has a short description here and a reference file with the details, so load a reference only when you reach its phase.

| Phase | Goal | Read |
| --- | --- | --- |
| 1. Brief | Agree on concept, name, symbol, palette, type, signature control | this file |
| 2. Scaffold | Generate the starter with the app's name | this file |
| 3. Brand | Mark, app icon, tray icons, wordmark, DMG art | `references/brand-assets.md` |
| 4. UI | Tokens, layout, signature control, components, copy | `references/design-system.md` |
| 5. Feature | Real functionality, settings, IPC, tray, OS integration | `references/architecture.md` |
| 6. Look at it | Screenshot loop in both themes and every language | `references/testing-and-screenshots.md` |
| 7. Test | Unit + end-to-end tests, including the real OS effect | `references/testing-and-screenshots.md` |
| 8. Package | DMGs/installers, signing, verification on the packaged app | `references/packaging.md` |
| 9. Docs & handoff | README, credits, guides, clean commits | `references/packaging.md` (last section) |

### 1. Write a design brief

Spend a few minutes on this before writing code: decisions made here are cheap to change now and expensive later. Fill in this template from the user's request and show it to them when the concept carries meaning (a name, a symbol, a mascot); otherwise proceed with sensible choices and mention them.

```
Concept / metaphor : <the one idea, e.g. "a sunflower that wakes with the sun">
Name & tagline     : <name> — "<short tagline>"
Signature control  : <what the big control shows in each state and how it animates>
Palette            : canvas <light/dark>, brand <hue>, accent gradient <warm → hot>
Typography         : display <font>, UI <font>; must cover <languages>
Imagery            : <licensed photos from … | custom illustration | none>
Platforms & locales: <macOS / Windows>, <en, vi, …>
```

Check the symbol's connotations out loud before drawing it. A literal eye on a "stay awake" app felt like surveillance to its users and had to be replaced with a sunflower after release. Ask what feeling the symbol should give, and avoid anything that reads as watching, danger, illness or a competitor's mark. Never copy another product's name, icon or wording.

### 2. Scaffold from the starter

```bash
node <skill-dir>/scripts/scaffold.mjs --name "Focus Bloom" --dir ~/code/focus-bloom \
  --tagline "Deep work, beautifully." [--app-id com.example.focusbloom] [--protocol focusbloom]
cd ~/code/focus-bloom && npm install && npm run assets && npm start
```

Before installing, check for newer major versions (`npm view electron version`, same for `electron-builder`, `playwright-core`) and bump `package.json` if needed. Note Electron's minimum macOS (`LSMinimumSystemVersion` in `node_modules/electron/dist/Electron.app/Contents/Info.plist`) for the README.

What the starter contains and what to replace:

```
src/main/main.js        lifecycle, single instance, IPC (validated), dock policy, login item, notifications
src/main/session.js     EXAMPLE feature (on/off + timer) — replace or wire real effects into it
src/main/tray.js        tray/menu bar: template icons, click = toggle, right-click menu, countdown title
src/main/settings.js    schema-validated settings with atomic writes and first-run detection
src/main/commands.js    CLI flags and <protocol>:// links (forwarded to the running instance)
src/preload/preload.js  window.appApi — the only bridge to the UI
src/renderer/           index.html, styles.css (tokens + components), app.js (rendering), icons.js
src/shared/locales/     en.js, vi.js — every string, plus the data-driven "Learn more" content
assets/brand/*.svg      PLACEHOLDER mark, app icon, tray icons → replace in phase 3
src/renderer/images/    PLACEHOLDER landscape art → replace with licensed photos or your own art
scripts/                build-assets.mjs, e2e.mjs, screenshots.mjs
```

Run `npm test` and `npm run test:e2e` once right after scaffolding: they pass on the untouched starter, so any later failure is caused by your changes.

### 3. Brand

Design the mark first; everything else (icon, tray, lockup, DMG, header, signature control) derives from it. Read `references/brand-assets.md` for the specs and the generator patterns. In short:

- Draw on a centred coordinate system so the same geometry scales to the header, the big control and the icon. Generate organic or repetitive geometry (petals, rays, spirals, phyllotaxis seeds) with a small script instead of hand-placing points.
- App icon: macOS squircle 824 px inside a 1024 canvas (100 px margin), rich gradient, soft glow, drop shadow.
- Tray: macOS template images (black + alpha, 36-unit grid → 18/36/54 px). "On" filled, "off" outline. Make sure it can't be mistaken for a system glyph (a filled circle with rays reads as screen brightness, so give it character).
- Run `npm run assets`, then build a preview sheet (icon at 1024/64/32/16, tray at 1×/2×/3× on light and dark bars) and look at it before moving on.
- Need photos? `node <skill-dir>/scripts/commons-images.mjs` finds freely licensed Wikimedia Commons images and writes an attribution manifest. Credit every image in the UI and in `CREDITS.md`.

### 4. UI

Read `references/design-system.md`. The starter's tokens, layout and components are a strong default; adapt the palette and type to the brief rather than starting over. Key rules:

- Fixed 980×680 window, left 420 px control panel, right hero panel with a gradient scrim behind text. On macOS keep the top-left ~92×44 px free for the traffic lights, and start large dialogs at least 50 px from the top.
- The signature control is an SVG with an "off" art and an "on" art that cross-fade with scale/rotate and a slight overshoot, a progress ring driven by `stroke-dashoffset`, and a breathing glow. Respect `prefers-reduced-motion`.
- The primary action is a filled pill with icon + label. Secondary actions are icon buttons. Don't bury important actions as grey icons.
- Every string lives in the locale files. Keep labels short enough not to wrap at 420 px (screenshots will tell you), and keep all locales the same shape (`test/i18n.test.js`).

### 5. Feature & architecture

Read `references/architecture.md`. Implement the real work in the main process behind a small module (the starter's `Session` takes `effects.start/stop`), expose it to the UI through one validated `ipcMain.handle` per action plus one `preload.js` function, and broadcast state changes back. The renderer stays sandboxed: no Node, a strict CSP, no remote content, external links only via `shell.openExternal` for `https:`.

Add each new setting to `SCHEMA` (default + validator), to the preferences builder in `app.js`, and to every locale. Choose defaults deliberately and ask the user when a default changes system behaviour (start at login, auto-start of the feature).

### 6. Look at it

Run `npm run screenshots` (or `-- --lang en`) and open the images. Do this after every visual change; it's the only way to catch wrapping, overlap, contrast and spacing problems. Check:

- off / on / timed states, both themes, every language (long Vietnamese or German strings wrap first), every modal and tab
- nothing under the macOS traffic lights; dialogs don't touch window edges
- text on imagery stays readable (scrim strength), icons are crisp at 1×

Playwright forces `prefers-color-scheme: light` unless `colorScheme` is passed (the screenshot script handles it). Native menus and Finder windows can't be captured without Screen Recording permission, so the script renders the tray menu from the app's real menu data. Say so when you hand over such images.

### 7. Test

- `npm test`: unit tests with `node:test` (`t.mock.timers` for timers). Add tests for your feature's logic.
- `npm run test:e2e`: drives the real app. Extend it so it proves the real effect on the OS, not only UI state (for example, `pmset -g assertions` for power assertions, a file written, a port answering). Wait on state rather than fixed sleeps.

### 8. Package and verify

Read `references/packaging.md`. `npm run dist:mac` builds Apple Silicon, Intel and universal DMGs with an ad-hoc signature. Windows installers are built on Windows. Never call a build done until you have:

1. verified signature and architectures (`codesign --verify --deep --strict`, `lipo -archs`) and Info.plist keys,
2. mounted each DMG, copied the app out, and run `npm run test:e2e -- --app <copied .app>` (the x64 app runs under Rosetta),
3. confirmed the package contains the latest source (no `src/` file newer than the DMG).

Explain the one-time Gatekeeper approval for ad-hoc-signed apps in the README (macOS 15+: Privacy & Security › Open Anyway).

### 9. Docs and handoff

Write a README with a `<picture>` logo that switches for dark mode, a hero screenshot, features, install steps (including the first-launch approval), usage, automation, build commands, privacy and credits. Add `CREDITS.md` for photos and fonts. If the user wants user guides, generate them from the same screenshots in each language (pandoc can convert Markdown to `.docx`). Commit in logical steps and follow the user's attribution preferences for commit messages.

## Gotchas that cost the most time

- **opentype.js 2.x** returns `NaN` path data when glyphs are drawn at an offset or serialised with `toPathData()`. Draw at (0, 0), shift the commands and serialise yourself (`scripts/build-assets.mjs` does this).
- **Electron radio menu items** always force one item on. Use checkboxes for "current duration" style menus.
- **`tray.setContextMenu` on macOS** makes every click open the menu. Handle `click` to toggle and `right-click` with `popUpContextMenu`.
- **Template tray images** need the `Template` suffix (or `setTemplateImage(true)`) and black+alpha pixels. Use `setTitle(text, { fontType: 'monospacedDigit' })` so countdowns don't jiggle.
- **Ad-hoc signing** (`identity: "-"`) requires `hardenedRuntime: false`. A completely unsigned app shows "damaged" on Apple Silicon.
- **ES modules over `file://`** are unreliable in Electron renderers. Use classic scripts and UMD for code shared with main.
- **Window drag regions beat everything stacked above them.** A dialog's close button inside the top drag strip silently drags the window instead (Playwright clicks bypass this, so tests won't notice). Switch `.drag` to `no-drag` while any dialog is open — the starter does — and check close buttons by hand once.
- **CSS can't reach inside `<use>` shadow trees**. Animate the outer groups that wrap a `<use>`, not elements inside `<defs>`.
- **`node --test test/`** treats the folder as a module. Use a glob: `node --test "test/*.test.js"`.
- **The single-instance lock is keyed on the userData path**. A test's second instance must use the same `APP_USER_DATA`.
- **Wikimedia** serves thumbnails only at standard widths and rate-limits bursts. Request sizes through the API (`iiurlwidth`), send a descriptive User-Agent, batch ≤ 20 titles and honour `Retry-After`.
- **npm 11** may skip Electron's postinstall. The binary downloads on first `npm start`/test run, which is expected.
- **Fonts**: verify glyph coverage for every shipped language (for example, Vietnamese stacked diacritics) before choosing a display face.

## Before you hand over

- [ ] Brief agreed; symbol checked for connotations; no other product's name or marks used
- [ ] Placeholder mark, art and copy all replaced; every image credited
- [ ] Screenshots reviewed: both themes, every language, every state and modal
- [ ] `npm test` and `npm run test:e2e` pass, including a check of the real OS effect
- [ ] DMGs built, verified, mounted and E2E-tested from the copied app (each architecture)
- [ ] README (with first-launch approval steps), CREDITS.md and licence present
- [ ] Commits are logical and follow the user's attribution rules; nothing secret or machine-specific committed
