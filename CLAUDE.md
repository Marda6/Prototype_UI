# ENCY UI prototypes — map for Claude

Static HTML/CSS/vanilla JS, no build. Run with `node tools/dev-server.js` → http://localhost:5584/.
Design system: ENCY Core (dark theme, Inter, 2px grid, 20/24px row heights). Use only the CSS
variables from `packages/shared-ui/tokens.css`; never invent colours or fonts.

## Where things live

Each section is a folder in `packages/<section>/` with `index.html`, `app.css`, `app.js`, `assets/`.
The application shell (title bar, sidebar) is shared from `packages/shared-ui/`.

### `packages/project` — the open-project screen (Machining / Simulation tabs)

Search by the prefixes below; every panel is one HTML block + one CSS section + one JS section,
each marked with the same comment title.

| Panel / feature | HTML id / class | CSS prefix | JS anchor (comment or function) |
|---|---|---|---|
| Operation tree (Machining tab) | `#tree`, rows `.trow` | `.trow`, `.tlayer`, `.pslot`, `.opic` | `tree.addEventListener` |
| **Tree navigation** (big projects: search row under the toolbar, toggled by `#searchBtn` next to Sort / Ctrl+F; sticky Setup/Part/Group, selection pin, folded-branch op counts; error/warning statuses roll up op → Group → Part → Setup) | `#searchBtn`, `#treeTools`, `#treeSticky`, `#treeGhost` | `.tt-*`, `.tsticky`, `.tghost`, `.tsum` ("Tree navigation") | "Tree navigation", `treeSearchRun`, `treeNavDraw`, `treeRollup`, `treeSummaries`, `treeReveal` |
| ENCY393 stress project (391 ops, header tab `data-proj="ency393"`, `?project=ency393`) | generated into `#tree` | — | `BIG_PROJECT`, `bigProjectHTML`, `swapTree` |
| Status panel (operation: steps, Errors / Warnings cards, amber "parameters do not match" note + Revert after a parameter change of a calculated op, status `status-warn2`. Machine / Setup / Part / Group (`.is-branch`): kind · place · contents line, operations counted by status, the errors / warnings inside listed by type with counts, unfolding into operations that lead to them; only those lists scroll when the panel reaches the 3D view's height; opens from the sticky heads and the pinned selection too) | `#statusPanel` (`.stpanel`), `#stpPath`, `#stpMod`, `#stpOps`, `#stpProbs`, `#stpErrs`, `#stpWarns` | `.stp-*`, `.stp-plist` / `.stp-prow`, `.stp-op-only` / `.stp-br-only` | "Status panel", `stpOpen`, `stpFit`, `stpShow`, `stpBranch`, `stpLists`, `stpApply`, `STP_ERRS`, `STP_WARNS` |
| **NC block panel** (block window on the Simulation tab) | `#ncPanel` (`.stpanel.ncpanel`) | `.ncpanel`, `.ncp-*` | "NC block panel", `ncShow`, `ncSync`, `ncFollow`, `ncSetEdit` |
| Simulation code tree | `#simTree`, rows `.simrow` | `.simrow`, `.sim-*` | `simRender` |
| Simulation control bar + timeline | `#simBar`, `#simTl` | `.simbar`, `.sb-*`, `.tl-*` | "the control bar", `simTick`, `simTlSync` |
| Compact (docked) sim controls | `#simDock` | `.sim-dockbar`, `.sd-*` | `sdUndock` |
| Single-operation mode (double-click on the dock resizer, or squeeze the tree to about its size; pulling the resizer down leaves it) | `#singleOp` | `.singleop`, `.so-*` | "single-operation mode", `setSingle`, `singleH`, `SINGLE_IN` / `SINGLE_OUT` in "Dock resizer" |
| Simulation popovers (settings, stop conditions, collision list) | `#simPop`, `#stopsPop`, `#collPop` | `.simpop`, `.sp-*`, `.coll-*` | `spOpen`, `collListRender` |
| Filters panel on the 3D view | `#filters` | `.filters` | — |
| Themes, picked in the logo menu (Dark / Light): Graphite (default) · Steel (slight blue tint) · Silver and Frost — their light pairs (`data-theme` `graphite-light` / `steel-light`, lightness mirrored in OKLab, raised ink opacities, darkened accents, near-white panel wells). One base + one ink per theme; header and panels a step off the scene | `#logoBtn` → `.hmenu`; `data-theme` on `<html>` | `--th-base`, `--th-ink`, `--th-k4/8/12`, `--th-panel`, `--th-red…` ("Themes" in `app.css`); `.hm-*` and `.topbar` in `shared-ui/chrome.css`; light icons: `assets/light/` + `theme-icons.css` | `shared-ui/chrome.js`: `THEMES`, `localStorage['ency.theme']`; `tools/theme-icons.js` regenerates the light icons (run after changing an icon); `tpedit.js`: `themeSync` |
| Inspector (bottom-left) | `.irows`, `.irow` | `.irow`, `.ictl`, `.dropdown` | "Inspector" |
| **Inspector tabs** (the rail: set follows the selected tree node — machine / setup / part / group / operation, Hole only for drilling ops; optional op tabs Job · Transformation · Macro template · Part · Workpiece toggled in the More overlay; tabs without room move into More) | `#railTabs`, `#railMore` → `.dd-menu.rail-menu` | `.rbtn`, `.ricn`, `.rail-menu`, `.rm-opt` | "Inspector tabs", `RAIL`, `RAIL_CTX`, `RAIL_OPT`, `railSync`, `railDraw`, `railOpen`, `railMenu`; icons `assets/rail-*.svg` (Core `icn_inspector` 54:930) |
| **Toolpath edits** (rail tab "Edits": list of Trim / Links / Feeds, 3D toolpath canvas, edit bar) | `.rbtn[data-tab=Edits]`, `.tp-view`, `.tpe-bar` | `.tpe-*` ("Toolpath edits (tpedit.js)") | `tpedit.js`: `evaluate`, `deriveLinks`, `beginEdit` / `commit` / `cancel` / `leave`, `barSync` |
| Drawing bar (shared: wand · Line · Normal · Polyline · Spline · Free / On Surface) | `.ency-draw` | `shared-ui/drawbar.css` | `shared-ui/drawbar.js`: `ENCY_DRAWBAR.create` |

Icon placeholders: `.opic` is the 20×20 slot with a faint rounded square used for Setup / Part /
operation icons in both trees and in the NC block panel.

### NC block panel — behaviour summary

Opens on a code-line double-click, a click on the line's dot / status icon, or the operation's
status circle in the sim tree. While open it follows any mouse selection, the playhead and the
Up/Down arrow keys; closes only via ✕ or Esc. Transport acts on the block only (prev / play block /
next); the pencil toggles editable value cells. A collision block shows the red "Holder collision"
notice and the block row + its operation get `status-error.svg`.

## Conventions

- Prefer existing components and tokens; if something is missing, say so and propose adding it once.
- Keep density: 2–4px gaps, 20/24px controls, 16/20px icons.
- Scroll containers use `scrollbar-gutter: stable` so layout never jumps.
- Commit messages: short title + bullet list of what changed; push to both remotes
  (`origin` = EncySoftware/ENCY_UI, `marda` = Marda6/Prototype_UI, GitHub Pages).
