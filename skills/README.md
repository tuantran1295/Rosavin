# Claude Code skills

## beautiful-electron-app

A skill that guides Claude through building polished, beautiful Electron desktop apps for macOS and Windows (the approach used to build Rosavin): design brief, a runnable starter with a design system, tray/menu bar integration, preferences, two languages, a brand asset pipeline, Playwright tests and framed screenshots, and verified DMG packaging.

```
beautiful-electron-app/
├── SKILL.md              the workflow Claude follows
├── references/           design system, architecture, brand assets, testing, packaging
├── scripts/
│   ├── scaffold.mjs      create a new app from the starter
│   └── commons-images.mjs  find and download freely licensed photos with credits
└── assets/starter/       the starter app (Electron, no bundler)
```

### Install

Personal (available in every project):

```bash
mkdir -p ~/.claude/skills
cp -R skills/beautiful-electron-app ~/.claude/skills/
```

Or only for one project: copy it to `<project>/.claude/skills/beautiful-electron-app`.

Then ask Claude Code something like *"Build a beautiful menu bar app that reminds me to drink water"*, and it will use the skill. You can also scaffold by hand:

```bash
node ~/.claude/skills/beautiful-electron-app/scripts/scaffold.mjs --name "Focus Bloom" --dir ~/code/focus-bloom --tagline "Deep work, beautifully."
cd ~/code/focus-bloom && npm install && npm run assets && npm start
```

Requirements: Node.js 20+, macOS for DMG builds and screenshots (Windows installers build on Windows).
