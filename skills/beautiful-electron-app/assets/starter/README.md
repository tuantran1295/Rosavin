# __APP_NAME__

__TAGLINE__

## Develop

```bash
npm install
npm run assets      # icons, tray icons, logo lockups, DMG background (from assets/brand/*.svg)
npm start
```

| Command | What it does |
| --- | --- |
| `npm start` | Run the app |
| `npm test` | Unit tests (node:test) |
| `npm run test:e2e` | Drive the real app with Playwright (`-- --app release/mac-universal/__APP_NAME__.app` for a packaged build) |
| `npm run screenshots` | Framed screenshots for docs and visual review (macOS) |
| `npm run assets` | Regenerate every icon from the SVG sources |
| `npm run dist:mac` | DMGs for Apple Silicon, Intel and universal → `release/` |
| `npm run dist:win` | Windows installer (run on Windows) |

## Project map

```
src/main/       main process: lifecycle, window, tray, settings, IPC, commands
src/preload/    the only bridge to the UI (window.appApi)
src/renderer/   UI: index.html, styles.css (design tokens), app.js, icons.js, fonts, images
src/shared/     locales (en, vi) and formatting shared by main and UI
assets/brand/   logo, app icon and tray icon sources (SVG)
scripts/        assets, e2e, screenshots
test/           unit tests
```

Fonts: Be Vietnam Pro and Fraunces, SIL Open Font License (see `src/renderer/fonts`).
