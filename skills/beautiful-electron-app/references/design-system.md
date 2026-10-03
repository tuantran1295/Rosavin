# Design system

How the starter's UI is built and how to adapt it without losing the polish. All of it lives in `src/renderer/styles.css` (tokens first) and `src/renderer/index.html`.

## Contents
1. Tokens (light and dark)
2. Typography
3. Layout anatomy
4. The signature control
5. Component catalogue
6. Imagery and the hero panel
7. Motion
8. Copy and localisation
9. Accessibility
10. Visual QA checklist

## 1. Tokens

Every colour, shadow and font is a CSS custom property on `:root`, redefined inside `@media (prefers-color-scheme: dark)`. `nativeTheme.themeSource` (the Theme preference) drives that media query, so the renderer never needs theme logic.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#FBF6EC` | `#0B1D17` | window canvas |
| `--panel` | `#FFFDF8` | `#10261F` | dialogs, raised surfaces |
| `--surface` / `--surface-2` | `#F3EAD9` / `#EDE2CD` | `#132F26` / `#183A2F` | cards, chips, inputs |
| `--text` / `--text-2` / `--text-3` | `#10261E` / `#43574E` / `#74857D` | `#F6EEDC` / `#BCCBC3` / `#83988E` | primary, secondary, tertiary text |
| `--line` / `--line-strong` | 11% / 20% ink | 10% / 18% cream | hairlines |
| `--brand` / `--brand-strong` | `#1B6B51` / `#0F4A37` | `#47A985` / `#7FD0AE` | switches, primary buttons, links |
| `--gold` / `--gold-2` / `--gold-ink` | `#E9A23B` / `#F7C35A` / `#8A5512` | `#F4B544` / `#FFD27A` / `#FFD27A` | accent, focus ring, accent text |
| `--rose` | `#D9604A` | | warm secondary accent (tab underline) |
| `--chip-active-bg/-text` | emerald / pale gold | gold / near-black | the selected chip inverts per theme |
| `--art-off` | `#A9B8AF` | `#46645A` | the signature art when "off" |
| `--shadow-sm/md/lg` | soft, ink-tinted | deeper, black | elevation |

How to re-skin for a new brand:
- Pick **one canvas family** (warm cream / cool paper / graphite), **one brand hue** for interactive elements, and **one warm accent gradient** (light → saturated → hot, e.g. `#FFE08A → #F5A743 → #E2694B`) for the hero action and the progress ring.
- Derive dark mode by hand: a deep tinted background (never pure black), raise surfaces by lightening 4–8%, lift the brand hue's lightness so it still passes contrast, and keep the accent gradient.
- Check text contrast: body ≥ 4.5:1 and large text ≥ 3:1 against its actual surface, in both themes.

## 2. Typography

- Bundle fonts in `src/renderer/fonts/` and declare them with `@font-face` (`font-display: block` avoids a flash of fallback text). Ship the OFL licence files next to them.
- Pair a **display face** for the wordmark, titles and status (starter: Fraunces SemiBold, a soft serif) with a **UI face** for everything else (starter: Be Vietnam Pro 400/500/600/700, which covers Vietnamese fully).
- Before choosing, verify coverage for every shipped language. Check with fontTools: `TTFont(f).getBestCmap()` must include every character you need (for Vietnamese, `ắằẳẵặấầẩẫậếềểễệốồổỗộớờởỡợứừửữựỳỷỹỵđĐƯƠ`).
- Scale used: 11 px uppercase labels (letter-spacing 0.9px), 11.5–13.5 px UI text, 14.5 px hero text, 22–25 px section and status titles, 36–46 px hero titles. Line height 1.5 (1.6–1.65 for paragraphs).
- `font-variant-numeric: tabular-nums` on anything that counts (countdowns, chips, versions).
- Botanical or scientific names in *italic* display type look intentional, e.g. the hero title.

## 3. Layout anatomy

```
┌──────────── 980 × 680, not resizable ────────────────────────────┐
│ ● ● ●  [mark] Name                 [EN|VI] │░░░░░ drag strip ░░░░│  ← 52–62 px drag region
│                                            │                     │
│              ( signature control )         │   hero art / photo  │
│                hint · status title         │   + gradient scrim  │
│                status subline              │                     │
│  LABEL                                     │  KICKER             │
│  [∞][15m][30m][1h][2h][4h]  chips          │  Big italic title   │
│  ┌ setting card: icon · title · hint · ◉ ┐ │  short paragraph    │
│  ───────────────────────────────────────── │  [ CTA pill  → ]    │
│  ✦ tray hint                               │                     │
│  ☑ show at startup     [⚙ Preferences] (i) │          credit     │
└────────── 420 px ──────────────────────────┴──── 560 px ────────┘
```

- macOS uses `titleBarStyle: 'hiddenInset'` with `trafficLightPosition {20, 20}`: content runs under the buttons, so keep x < 92 px, y < 44 px empty (the header gets `padding-left: 92px` via `.platform-darwin`). Windows uses the native frame.
- The header and the hero top are `-webkit-app-region: drag`; interactive children are `no-drag`. While a dialog is open, the starter turns all drag regions off (`.has-layer`) because drag regions take priority over anything stacked above them.
- Dialogs: `dialog-xl` (920 wide, nearly full height, banner header + tabs) for rich content, `dialog-md` (560) for preferences, `dialog-sm` (440) for about/confirmations. On macOS the xl dialog starts ~50 px from the top so it clears the traffic lights.
- 8 px rhythm; radii 9–10 (controls), 14–16 (cards), 18 (dialogs), 999 (pills and switches).

## 4. The signature control

The big round button is the app's personality. Structure (see `index.html`):

```html
<button class="orb" id="orb" aria-pressed="false">
  <span class="orb-glow"></span>                       <!-- radial glow, "breathes" when on -->
  <svg class="orb-svg" viewBox="-110 -110 220 220">
    <circle class="orb-track" r="100"/>
    <circle class="orb-progress" r="100" transform="rotate(-90)"/>   <!-- dasharray 628.32 -->
    <g transform="scale(0.22)">
      <g class="art-off"><use href="#mark-off"/></g>   <!-- muted, folded, calm -->
      <g class="art-on"><g class="art-spin"><use href="#mark-on"/></g></g>  <!-- gold, blooming -->
    </g>
  </svg>
</button>
```

- State lives on `<html>` as `.is-active` / `.is-indefinite`, so one class flip drives the background, glow, art, ring and status colour.
- Off → on: `art-off` fades out and grows slightly; `art-on` fades in from `scale(0.62) rotate(-35deg)` to rest with an overshoot curve (`cubic-bezier(0.34, 1.4, 0.64, 1)`), then slowly rotates (140 s per turn).
- Progress ring: `stroke-dashoffset = 628.32 × (1 − remaining / total)` updated each second with a `1s linear` transition, so it drains smoothly. Indefinite sessions show a full ring.
- Use `transform-box: fill-box; transform-origin: center` on the animated groups, and animate the groups that wrap a `<use>`: CSS cannot reach into `<use>` shadow trees.
- Give the "off" art a different silhouette (folded petals, an outline) as well as a different colour, so the state reads even for colour-blind users.

## 5. Component catalogue (class names in the starter)

| Component | Classes | Use for |
| --- | --- | --- |
| Brand row | `.brand`, `.brand-mark`, `.brand-name` | mark + wordmark-style name, language switch at right |
| Chips | `.chips > .chip` (`.is-selected`, `.is-default`) | quick choices; selected inverts colours |
| Setting card | `.setting-card`, `.setting-icon`, `.switch` | the one or two settings worth surfacing on the main screen |
| Switch | `input.switch[type=checkbox][role=switch]` | booleans, iOS-style, animates the knob |
| Primary pill | `.prefs-button` | an important action that must stand out (icon + label, filled brand colour) |
| Icon button | `.icon-button` | secondary actions (about, close) |
| CTA pill | `.cta` | hero action, warm gradient, arrow nudges on hover |
| Segmented control | `.segmented > button[aria-pressed]` | 2–3 mutually exclusive options |
| Select | `.select` | longer option lists, custom chevron |
| Tabs | `.tabs > .tab[role=tab]`, `.tab-panel` | rich dialog content, arrow-key navigation |
| Cards | `.card-grid > .card`, `.card-icon`, `.badge-{green,gold,gray}` | features, benefits |
| Steps | `.steps > .step`, `.step-num` | "how it works" sequences |
| Facts | `dl.facts > .fact` | key/value summaries |
| Callout | `.callout` | one important note per section |
| Gallery + lightbox | `.gallery > .photo`, `#lightbox` | imagery with captions and credits |
| Links list | `ol.links` | sources, further reading |

The "Learn more" dialog is data-driven: each tab in `locales/*.js → learn.tabs` has `blocks` of type `paragraphs | facts | cards | steps | callout | gallery | links`, rendered by `BLOCKS` in `app.js`. Add a block type there when content needs a new shape.

## 6. Imagery and the hero panel

- Real photography gives instant richness. Use freely licensed sources (Wikimedia Commons via `scripts/commons-images.mjs`), keep credits visible (the photo credit under the hero, credit lines in galleries, `CREDITS.md`).
- Crop for the hero's portrait shape (≈ 560×680 CSS px → 1120×1360 px for Retina), compress to JPEG q≈80, strip metadata after confirming the image is sRGB.
- A scrim makes text legible on any image: a top fade (for the drag strip) plus a bottom-heavy fade to ~94% of the darkest brand colour.
- No photo? The starter's landscape SVGs (layered ridges, sun glow, stars, mist) are a good fallback style: cheap, crisp at any size, licence-free.

## 7. Motion

- Easing `cubic-bezier(0.22, 1, 0.36, 1)` for most transitions; overshoot only for the signature moment.
- Dialogs: backdrop fade 0.2 s + dialog "pop" (translateY 10 px, scale 0.98 → 1) 0.28 s.
- Hover feedback is small: 1 px lift, 1–2% scale, colour shift. Press: scale 0.97.
- One ambient animation at most (glow breathing / slow spin), only in the active state.
- `@media (prefers-reduced-motion: reduce)` collapses all durations.
- Fade the app in once the first snapshot has rendered (`body.is-ready`) so placeholder text never flashes.

## 8. Copy and localisation

- Short, human labels: "Ready when you are", "Until 4:17 PM · 38 min left". Explain states in the subline, not in tooltips.
- All strings live in `src/shared/locales/<code>.js` as plain data (no functions) so main can send them over IPC. Placeholders use `{name}`.
- Keep every locale structurally identical (test enforced). Identifiers inside content lists (`icon`, `type`, `id`, `src`, `tone`…) are never translated.
- Long languages wrap first: review Vietnamese/German screenshots and shorten rather than shrink fonts.
- Use the OS's own wording for OS features in each language (e.g. Vietnamese macOS says "Quyền riêng tư & Bảo mật › Vẫn mở").

## 9. Accessibility

- Real `<button>`s everywhere; the signature control has `aria-pressed` and a changing `aria-label`.
- Dialogs: `role="dialog" aria-modal="true" aria-labelledby`, focus moves to the close button on open and returns to the opener on close; Tab is trapped; Escape closes the topmost layer.
- Tabs: `role=tablist/tab/tabpanel`, `aria-selected`, roving `tabIndex`, Arrow/Home/End keys.
- Visible focus ring (`:focus-visible`, gold, 2 px offset).
- Status line is in an `aria-live="polite"` region.

## 10. Visual QA checklist

- [ ] No wrapped single words, clipped text or overlapping elements at 980×680
- [ ] Off, on and timed states all look intentional; ring progress visible
- [ ] Both themes reviewed; no pure-white text on light surfaces or vice versa
- [ ] Every language reviewed; diacritics render in the display face
- [ ] Nothing under the traffic lights; every dialog's close button clicks in the real app
- [ ] Images credited; hero text readable over the image
- [ ] Icons crisp at 1×; tray icon readable on light and dark menu bars
