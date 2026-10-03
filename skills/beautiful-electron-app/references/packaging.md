# Packaging, verification and handoff

## Contents
1. electron-builder configuration
2. Signing options
3. Building
4. Verifying a build (do all of it)
5. First-launch instructions for users
6. Windows notes
7. Docs and handoff

## 1. electron-builder configuration

The starter's `electron-builder.yml`, and why each part is there:

- `files: [package.json, src/**/*]`: package only the app, never scripts, docs or brand sources. Check with `@electron/asar`: `asar.listPackage('…/app.asar')`.
- `protocols`: registers `<protocol>://` (macOS `CFBundleURLTypes`, Windows registry via NSIS).
- `mac.target: dmg` × `[universal, arm64, x64]`: the universal DMG works everywhere (about twice the size); the per-arch DMGs are about half. Ship all three and label them "Apple Silicon", "Intel" and "any Mac".
- `electronLanguages: [en, vi]` (`[en-US, vi]` on Windows): strips unused Chromium locales (≈13 MB smaller) and keeps macOS system menus in your languages.
- `extendInfo.LSUIElement: true`: menu bar app with no Dock icon until the window opens. Remove it for a regular app.
- `dmg`: 660×400 window, HiDPI TIFF background, 112 px icons at (180, 196) and an `/Applications` link at (480, 196).
- `artifactName: ${productName}-${version}-${arch}.${ext}` gives predictable release file names.

## 2. Signing options

| Option | Config | User experience |
| --- | --- | --- |
| Ad-hoc (no Apple account) | `identity: "-"`, `hardenedRuntime: false` | Runs on all Macs; one-time approval on first launch (section 5) |
| Developer ID, not notarized | `identity: "<cert name>"`, `hardenedRuntime: true` | Still warned when downloaded |
| Developer ID + notarization | add `notarize: true`; env `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Opens normally |

- Ad-hoc signing with hardened runtime makes the app crash: library validation rejects the ad-hoc-signed framework. Keep `hardenedRuntime: false` for ad-hoc.
- A completely unsigned (or re-signed-then-modified) app shows "is damaged and can't be opened" on Apple Silicon. To repair locally: `codesign --force --deep --sign - App.app`.
- Find available identities with `security find-identity -v -p codesigning`.

## 3. Building

```bash
npm run assets          # make sure icons and the DMG background are current
npm test && npm run test:e2e
npm run dist:mac        # → release/<App>-<v>-{arm64,x64,universal}.dmg (+ release/mac*/<App>.app)
npm run dist:win        # on Windows → release/<App> Setup <v>.exe
```

- The first build downloads Electron zips for each arch (cached in `~/Library/Caches/electron`) and a `dmgbuild` bundle.
- To build one arch quickly while iterating: `npx electron-builder --mac dmg --arm64`.
- `npm install` on npm 11 may warn that install scripts weren't run; Electron downloads its binary on first use, so this is expected.

## 4. Verifying a build (do all of it)

```bash
A=release/mac-universal/<App>.app
lipo -archs "$A/Contents/MacOS/<App>"                       # x86_64 arm64 (universal)
codesign --verify --deep --strict "$A" && codesign -dv "$A" 2>&1 | grep -E 'Signature|Identifier'
/usr/libexec/PlistBuddy -c 'Print :LSUIElement' -c 'Print :LSMinimumSystemVersion' \
  -c 'Print :CFBundleShortVersionString' -c 'Print :CFBundleURLTypes:0:CFBundleURLSchemes:0' "$A/Contents/Info.plist"
for v in arm64 x64 universal; do hdiutil verify "release/<App>-<ver>-$v.dmg"; done
find src package.json electron-builder.yml -newer "release/<App>-<ver>-universal.dmg" -type f   # must print nothing
```

Then test what users actually get:

1. `hdiutil attach -nobrowse -readonly <dmg>`. Check the volume has the app, an `Applications → /Applications` link, `.background.tiff`, `.VolumeIcon.icns` and `.DS_Store`.
2. `ditto` the app to a temp folder, detach, and confirm the copied signature still verifies.
3. `npm run test:e2e -- --app <copied .app>` for each architecture. On Apple Silicon the x64 app runs under Rosetta (`arch -x86_64 /usr/bin/true` tells you whether Rosetta is installed).
4. Launch the copied app normally (`open -a <copied .app> --args --hidden`) and drive it with `open "<protocol>://start?minutes=5"`, then check the OS effect. Afterwards, `kill` it, unregister the temporary copy (`/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -u <copy>`) and delete it, so LaunchServices doesn't route the scheme to a stale path.
5. Optional: decode the DMG's `.DS_Store` (Python `ds_store` package in a venv) to confirm the window size, the background and the icon positions when Finder can't be screenshotted.

Note `spctl --assess` says "accepted" on Macs where Gatekeeper is disabled, so it is not proof of what users will see.

## 5. First-launch instructions for users

Put this in the README and user guides for ad-hoc-signed builds (adapt the app name):

> **First launch only.** <App> is free and open source and not notarized by Apple, so macOS asks you to confirm it once.
> - **macOS 15 Sequoia or later:** when you see *"<App>" Not Opened*, click **Done**, open **System Settings › Privacy & Security**, scroll to **Security** and click **Open Anyway**, confirm with your password or Touch ID, then click **Open Anyway** again.
> - **macOS 13–14:** Control-click the app in Applications › **Open** › **Open**.
> - Terminal alternative: `xattr -dr com.apple.quarantine /Applications/<App>.app`

Vietnamese wording (macOS's own labels): *Cài đặt hệ thống › Quyền riêng tư & Bảo mật › Vẫn mở*; on macOS 13–14, *Control-nhấn › Mở*.

Also state the minimum macOS version (Electron 44 requires macOS 13) and how to pick the right DMG (Apple menu › About This Mac › Chip/Processor).

## 6. Windows notes

- Build on Windows. Cross-building from macOS needs Wine for resource editing.
- NSIS per-user install goes to `%LOCALAPPDATA%\Programs\<App>`, with Start menu and desktop shortcuts.
- Unsigned installers trigger SmartScreen ("More info › Run anyway"). Code signing via `CSC_LINK`/`CSC_KEY_PASSWORD` or Azure Trusted Signing removes it over time.
- The tray icon may hide behind the ^ overflow; tell users they can drag it onto the taskbar.
- If you haven't tested a Windows build on real Windows, say so rather than shipping it as verified.

## 7. Docs and handoff

- **README**: `<picture>` logo (light/dark), one-sentence pitch, hero screenshot, features, download table (which DMG for which Mac), first-launch steps, usage table, automation (`<protocol>://…`, CLI flags), run-from-source and build commands, how it works (the OS API used and how to verify it), privacy (no network, where settings live), credits, licence.
- **CREDITS.md**: every photo (title, author, licence, source link, what was changed) and every font licence.
- **User guides** (if requested, one per language) built from the screenshots. To produce Word files: `pandoc guide.md --from markdown+gfm_auto_identifiers --resource-path docs --reference-doc reference.docx -o guide.docx`. Keep the Markdown free of pandoc-only syntax (`{width=…}`, YAML front matter) so it renders on GitHub; set image widths with a Lua filter instead.
- **Release**: attach the three DMGs (and the Windows installer if verified) to a GitHub release with SHA-256 checksums (`shasum -a 256 release/*.dmg`). The DMGs don't belong in git; ignore `release/`.
- **Commits**: logical steps with clear messages, following the user's rules on attribution trailers; never commit secrets, `node_modules` or machine-specific paths.
