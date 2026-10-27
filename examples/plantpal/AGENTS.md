# Building UI screens — rules for agents

This folder is the **design source of truth** for PlantPal: static HTML, one file per artboard, no build step.
Screens are designed here first, reviewed in the gallery, then handed to whoever builds the app (`uis spec`).

## Files

| File | What it is | You edit it? |
|---|---|---|
| `BRIEF.md` | Canonical demo data (people, numbers, dates, copy) and business rules | Read before every screen. Add facts here, never invent them inline. |
| `COMPONENTS.md` | Copy-paste markup for every component in `kit/components.css` | Read before every screen. |
| `screens/manifest.js` | Every artboard, grouped by flow | Yes (or via `uis new`) |
| `screens/<CODE>.html` | One artboard | Yes |
| `kit/tokens.css` | Colors, spacing, radii, type | Only to rebrand / add tokens |
| `kit/components.css` | Shared components | Add classes; never rename ones in use |
| `kit/uis.js` | Icons + status bar + prototype links + self-check | Add icons to `ICONS` |
| `styles/<group>.css` | Styles used by one group only | Yes |

## Workflow (do it in this order)

1. **Plan the flow** in `screens/manifest.js`: groups are flows (A onboarding, B core loop…), screens are states.
   Include the unhappy states: empty, loading, error, limit reached, expired, permission denied.
2. **Create** each screen with `uis new B4 "Lead detail" --like B3` (copying a sibling keeps the chrome identical)
   or without `--like` for a skeleton (`--tabs`, `--web`, `--sheet`, `--scroll`).
3. **Fill it** with components from `COMPONENTS.md` and data from `BRIEF.md`.
4. **Wire navigation**: put `data-goto="CODE"` on every control that opens another screen.
5. **Write notes** in `<aside data-notes hidden>`: numbered, one per control or rule. What it does, which screen it
   opens, which API/business rule is behind it, edge cases. This becomes the build spec.
6. **Verify**: `uis check B4` (must be 0 errors), then `uis shot B4` and **look at `shots/B4.png`**.
   For a whole flow, `uis sheet B` and look at `shots/_sheet-B.png`.
7. Repeat. When a group is done, run `uis check` for everything and `uis spec`.
8. **Share** for review with `uis export` (or `uis export B` for one flow): one self-contained HTML file in `dist/`.

## Rules

- Use only classes from `kit/` or `styles/`. `uis lint` reports unknown classes; that usually means a hallucinated class.
- Colors only through `var(--token)` or the `.c-*` / variant classes. Hard-coded colors are allowed only inside an
  element marked `data-free` (a third-party UI imitation, a customer's brand, an illustration).
- Icons: `<svg class="i"><use href="#i-NAME"/></svg>`. Size with `style="--i:16px"`. `uis icons` lists names.
  Need a new one? Add its Lucide path to `ICONS` in `kit/uis.js`. Never paste inline `<svg viewBox>` icons.
- Images: use `.ph` placeholders (`<div class="ph" style="--hue:30;height:180px"></div>`), never remote URLs.
- The status bar is just `<div class="status-bar"></div>`. `uis.js` fills in the time and glyphs.
- Same story everywhere: same names, prices, dates and counts as `BRIEF.md`. If a screen needs a new fact,
  add it to the brief first.
- Real copy, not lorem ipsum. Write the actual labels, errors and empty states.
- Fixed phone artboards are 402×874. If content runs past the bottom on purpose (to show scrolling), `uis check`
  reports `cut-off` as info. Use `.artboard.scroll` for a full-length view.
- One artboard per file. A bottom sheet or modal is its own screen: the parent screen's content underneath, plus `.scrim` and `.sheet`.

## Self-check output

`uis check` prints one issue per line: `CODE level type element — message`.
- `missing-icon`, `unknown-icon`: the icon isn't in the sprite.
- `overflow-x`: something sticks out past the artboard edge. Shorten copy, let it wrap, or use `.grow` / `.truncate`.
- `clipped-text` / `nowrap-overflow`: text is wider than its box.
- `unknown-class`: a class that no CSS defines.
- `bad-goto`: a link to a screen that isn't in the manifest.
- `hard-coded-color`: use a token, or mark the subtree `data-free` if it's intentional.
