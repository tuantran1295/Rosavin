# Brand assets

From concept to every icon size, plus imagery sourcing. Sources live in `assets/brand/*.svg`; `npm run assets` (`scripts/build-assets.mjs`) renders everything else.

## Contents
1. From concept to symbol
2. Drawing the mark
3. Generating geometry with code
4. App icon spec
5. Tray icon spec
6. Wordmark, lockups and the DMG background
7. The asset pipeline
8. Reviewing the result
9. Imagery: finding and crediting photos

## 1. From concept to symbol

- Start from the brief's metaphor and list 3–5 candidate symbols. Prefer ones that suggest the app's *benefit* and an on/off story. For a keep-awake app, a sunflower that folds at night and blooms in the sun beat a literal open eye.
- Test connotations: an eye feels like surveillance, a lock like restriction, a skull like danger. Ask the user how the symbol feels if there's any doubt.
- Make sure the symbol has two clear states (on/off) for the tray and the signature control.
- Avoid other products' marks and trade dress, generic stock icons (a plain lightning bolt, a plain coffee cup) and any text inside the icon.

## 2. Drawing the mark

- Draw in SVG on a centred coordinate system (`viewBox="-380 -380 760 760"`, design centred on 0,0). The same `<g>` then drops into the header (30 px), the signature control (`scale(0.22)`), the app icon (`translate(512 512) scale(…)`) and lockups.
- Build from a few primitives (petals, circles, lances) reused with `<use>` and `rotate()`. Use `gradientUnits="userSpaceOnUse"` so gradients follow each rotated copy (e.g. darker at a petal's base, lighter at its tip).
- Keep a light-background variant (`mark-light.svg`) with deeper colours or a hairline outline. Pale gold on cream disappears.
- Iterate visually: render to PNG with resvg and look at it (step 8). Expect 3–5 rounds; compare variants side by side.

## 3. Generating geometry with code

Organic or repetitive shapes look far better computed than hand-placed. Write a small `scripts/make-<symbol>.mjs` that writes the SVG sources, and keep it in the repo so the artwork stays editable. Useful building blocks:

```js
const n = (v) => String(Math.round(v * 100) / 100);
// Lance-shaped petal pointing up from radius r1 to r2, half-width w.
function petal(r1, r2, w) {
  const L = r2 - r1;
  return `M0 ${n(-r1)} C${n(w * 0.95)} ${n(-(r1 + L * 0.18))} ${n(w)} ${n(-(r1 + L * 0.62))} 0 ${n(-r2)} ` +
         `C${n(-w)} ${n(-(r1 + L * 0.62))} ${n(-w * 0.95)} ${n(-(r1 + L * 0.18))} 0 ${n(-r1)}Z`;
}
// count copies of #id evenly around the centre, starting at offsetDeg.
const ring = (count, offsetDeg, id) => Array.from({ length: count },
  (_, i) => `<use href="#${id}" transform="rotate(${n(offsetDeg + (360 / count) * i)})"/>`).join('');
// Sunflower-style seed spiral (phyllotaxis): golden angle 137.508°, radius ∝ √k.
function seeds(count, maxR, dotMin, dotMax) {
  const c = maxR / Math.sqrt(count);
  return Array.from({ length: count }, (_, i) => {
    const k = i + 1, a = (k * 137.50776 * Math.PI) / 180, r = c * Math.sqrt(k), t = k / count;
    return `<circle cx="${n(r * Math.cos(a))}" cy="${n(r * Math.sin(a))}" r="${n(dotMin + (dotMax - dotMin) * t)}"/>`;
  }).join('');
}
```

Two offset rings of petals (16 + 16 rotated by 11.25°) around a disc with ~150 seeds make a convincing flower. The same script can also write the UI's `<defs>` into `index.html` between marker comments, so the window art never drifts from the logo.

## 4. App icon spec

- 1024×1024 canvas. macOS Big Sur+ style: a rounded rectangle 824×824 at (100, 100) with `rx≈185`, so the 100 px margin and a drop shadow are part of the artwork.
- Background: a diagonal gradient in the brand hue (light at top-left → deep at bottom-right), a soft radial glow behind the symbol, and a faint white highlight ellipse at the top.
- Symbol ≈ 75–80% of the squircle, with its own soft drop shadow (`feDropShadow`).
- Check it at 16 and 32 px: the silhouette must survive; drop fine detail if it turns to mush.
- Windows `.ico` uses the same art (16–256 px entries). Linux uses `build/icon.png`.

## 5. Tray icon spec

- macOS template images: black shapes with alpha only, 36-unit grid rendered at 18 px (1×), 36 px (2×) and 54 px (3×). Name them `…Template.png` (the starter: `trayOnTemplate*.png`, `trayOffTemplate*.png`).
- "On" = filled silhouette; "off" = the same silhouette as a ~1.9-unit outline (or a calmer pose of the symbol). Fill should cover the grid's centre ~28×28 units.
- Avoid reading as a system glyph: a filled circle with rays is "brightness", a crescent is "Do Not Disturb". Add identity, e.g. punch seed dots into a flower's disc with an SVG mask.
- Windows: coloured badges (rounded square, brand gradient for on, slate for off) because tray backgrounds vary. ICO entries 16, 20, 24, 32, 40, 48, 64.
- Review on light and dark bars at 1× and 2× before shipping.

## 6. Wordmark, lockups and the DMG background

- The wordmark is the app name in the display font, converted to outlines with opentype.js so logos render identically without the font installed. opentype.js 2.x gotcha: draw each glyph at (0, 0), shift its path commands by the running x, and serialise commands yourself (its `toPathData()` emits `NaN`). `build-assets.mjs` has a working `textPath()`.
- Lockups (`assets/brand/logo-{dark,light}.svg/png`): mark at left (~290 px tall), wordmark aligned to the mark's centre, uppercase letter-spaced tagline below in the accent colour.
- DMG background: 660×400 (+ @2x 1320×800, combined into a HiDPI TIFF with `tiffutil -cathidpicheck`). Small lockup at top, a dotted arrow between the two icon slots at (180, 196) and (480, 196), one instruction line at the bottom. Keep it light: Finder draws dark icon labels.
- README logos: use `<picture>` with a `prefers-color-scheme: dark` source.

## 7. The asset pipeline

`npm run assets` reads `brand.json` (name, tagline, fonts, colours) and the SVG sources and writes:

| Output | Used by |
| --- | --- |
| `build/icon.png` (1024), `build/icon.icns` (iconutil), `build/icon.ico` | electron-builder |
| `build/background.png`, `@2x`, `.tiff` | DMG window |
| `src/assets/icon.png` | window icon (Windows/Linux), dev Dock icon |
| `src/assets/tray/*` | tray (template PNGs, Windows ICO) |
| `src/renderer/images/brand/icon-256.png` | About dialog |
| `assets/brand/logo-*.svg/png`, `docs/images/logo-*.png`, `docs/images/icon.png` | README, docs |

It uses `@resvg/resvg-js` (fast and accurate, supports filters and gradients) with the bundled fonts, `iconutil` (macOS) for ICNS and a small built-in ICO writer. Commit both the sources and the outputs so contributors on any OS can build.

## 8. Reviewing the result

Render a contact sheet and look at it after every brand change:

```bash
magick -size 220x70 xc:'#ECECEC' src/assets/tray/trayOnTemplate@3x.png -gravity west -geometry +30+0 -composite \
       src/assets/tray/trayOffTemplate@3x.png -gravity east -geometry +30+0 -composite bar-light.png
magick build/icon.png -resize 64x64 icon64.png   # repeat for 32 and 16
```

ImageMagick (`magick`) is optional; a Node script with resvg can compose the same sheet. Check: silhouette at 16 px, contrast of the light-background variant, on/off difference at 1×, and alignment in the lockup.

## 9. Imagery: finding and crediting photos

`scripts/commons-images.mjs` (in the skill folder) wraps the Wikimedia Commons API:

```bash
node <skill-dir>/scripts/commons-images.mjs list "Category:Rhodiola rosea" --min 1400 > candidates.json
node <skill-dir>/scripts/commons-images.mjs sheet candidates.json sheet.jpg      # needs ImageMagick; look at it
node <skill-dir>/scripts/commons-images.mjs get "File:Example.jpg" --width 1280 --out src/renderer/images/photos
```

- It sends a descriptive User-Agent, batches ≤ 20 titles, honours `Retry-After`, requests standard thumbnail widths through `iiurlwidth` and strips tracking query strings.
- `get` appends to `<out>/credits.json` (title, author, licence, licence URL, source page). Copy those into the UI credit lines and `CREDITS.md`.
- Prefer CC0, public domain, CC BY and CC BY-SA. Avoid "non-commercial", "no derivatives" and unclear licences. CC BY-SA images stay CC BY-SA; the rest of the app does not have to.
- Pick images for composition: hero (portrait crop, subject in the upper two thirds, dark lower third for text), banner (wide, calm), gallery (variety: habitat, close-up, detail, product).
