---
name: ui-screens
description: Design app screens as static HTML artboards (uis framework) before building the app. Use when asked to design, mock up, wireframe or prototype screens/flows, or to add/change a screen in a ui/ folder that has screens/manifest.js.
---

# UI Screens

1. Find the project: a folder with `screens/manifest.js` (usually `ui/`). None? Run `npx ui-screens init ui --name "<App>"`
   (or `node <path>/bin/uis.js init`).
2. Read `ui/AGENTS.md`, `ui/BRIEF.md` and `ui/COMPONENTS.md` before writing any screen.
3. Plan groups and screens in `screens/manifest.js`, including empty, error and limit states.
4. For each screen: `uis new <CODE> "<Title>" [--like <sibling>]`, fill it from COMPONENTS.md + BRIEF.md,
   add `data-goto` links and numbered `<aside data-notes>`.
5. Loop until clean: `uis check <CODE>` (0 errors), then `uis shot <CODE>` and look at the PNG with the Read tool.
   Fix what looks wrong, not only what the checker reports.
6. Per flow: `uis sheet <GROUP>` and look at the contact sheet for consistency across screens.
7. Finish with `uis check` (all) and `uis spec`. Hand SPEC.md + the screens to the build.
8. To share for review: `uis export [GROUP]` writes one self-contained HTML file in `dist/` (attach, upload or host it).
