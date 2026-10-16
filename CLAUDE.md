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
| Filters panel on the 3D view (a plate of the panel frame colour at 25 % with a 2px blur (`--th-float`, the function bar too), no border; the title and the cells right on it, on = an ink tint (10 %, 25 % ring); folded, the 24px title is a button with a chevron; the drawing panel 4px below follows all of it; corner grip: an arc around the bottom-right corner, shown only while the pointer is over the panels; one column only while it fits — reaching the view cube, the view tools or the view's bottom the panels go back to two columns by themselves (grip hidden, `fFit`), the stored choice stays; pulled down → one column: model · machine and toolpath · dot / curve / face / mech, title becomes a chevron (up: fold, down: unfold); double-click toggles; kept in `localStorage['ency.filtersList']`) | `#filters`, `#filtersGrip` | `.filters`, `.filters.list`, `.f-grip` | "Filters: the corner grip", `fSetList`; right-click settings: `FS`, `fsOpen` |
| View cube corner (cube menu → Position: four corner buttons; bottom-left by default next to the view tools, bottom-right above the system bar, top-right, top-left right of the Filters column; view tools take the bottom-left when the cube leaves it; kept in `localStorage['ency.cubeCorner']`) | `#vcube`, `.viewport[data-cube]` | `.vcube`, `--vbar-b`, `--vpl-w` | "View cube": `cubeMenu`, `cubeAt`, `CUBE_CORNERS` |
| Floor grid + machine light of the 3D view (the XY plane drawn in the view cube's camera, so it turns with the cube: a line every 6.4px, every tenth stronger, origin at the centre of the free view; the diffuse light shows while the Machine filter is on; Environment in the cube menu hides both) | `canvas.vp-grid`, `.vp-glow`, `.viewport.env-machine` / `.env-off` | `.vp-grid`, `.vp-glow`, `--vp-glow` | "View cube": `gridDraw`, `GRID_STEP`, `glowSync` |
| Function bar (the ENCY function panel at the top of the 3D view, centred over the free view; the set follows the mode tab. Model: Smart snap, Measure tool, Geometry measuring | Spatial transformations, Surface triangulation, Intersect, Surfaces boundary projection, Extract isolines, Sew Faces, Patch hole, Join curves, Extend surface. Machining (and Simulation for now): Smart snap (switch, shared), Measure tool, Geometry measuring | Postprocessor, Machining report, Tools (list on hover, click = its first item, Load tool list) | Machine control panel, Graph of the axes, Verify compare, Tool reach inspector; ENCY tooltips; the functions are not built; icons from ENCY's own sprite `assets/ency/function-panel(-dark).svg` — cell names in ENCY's `Supplement/GUI/BtnsDarkIconPack.ini`, hints in the forms of `Bin64/SCKernel.dll`) | `.etb`, `.etb-b[data-fn]`, `.etb-tip` | `.etb-*` ("Function bar" in app.css) | "Function bar", `FN_BARS`, `fnRender` |
| Themes, picked in the logo menu (Dark / Light): Graphite (default) · Steel (slight blue tint) · Silver and Frost — their light pairs (`data-theme` `graphite-light` / `steel-light`, lightness mirrored in OKLab, raised ink opacities, darkened accents, near-white panel wells). One base + one ink per theme; header and panels a step off the scene | `#logoBtn` → `.hmenu`; `data-theme` on `<html>` | `--th-base`, `--th-ink`, `--th-k4/8/12`, `--th-panel`, `--th-red…` ("Themes" in `app.css`); `.hm-*` and `.topbar` in `shared-ui/chrome.css`; light icons: `assets/light/` + `theme-icons.css` | `shared-ui/chrome.js`: `THEMES`, `localStorage['ency.theme']`; `tools/theme-icons.js` regenerates the light icons (run after changing an icon); `tpedit.js`: `themeSync` |
| Inspector (bottom-left) | `.irows`, `.irow` | `.irow`, `.ictl`, `.dropdown` | "Inspector" |
| **Inspector tabs** (the rail: set follows the selected tree node — machine / setup / part / group / operation, Hole only for drilling ops; optional op tabs Job · Transformation · Macro template · Part · Workpiece toggled in the More overlay; tabs without room move into More) | `#railTabs`, `#railMore` → `.dd-menu.rail-menu` | `.rbtn`, `.ricn`, `.rail-menu`, `.rm-opt` | "Inspector tabs", `RAIL`, `RAIL_CTX`, `RAIL_OPT`, `railSync`, `railDraw`, `railOpen`, `railMenu`; icons `assets/rail-*.svg` (Core `icn_inspector` 54:930) |
| **Inspector placement** (three dots on top of the rail, Core 300:728 — under the tree / right of the tree / right edge of the window, the current one a long dot; out of the dock it is a full-height workspace panel, the tree takes the dock height, filters / view cube / view tools / status panels start at `--free-l`, the system bar ends at `--free-r`; hidden on the Simulation tab; kept in `localStorage['ency.inspPlace']`) | `#railPlace` `.rp-dot[data-place]`, `.workspace[data-insp]` | `.rail-place`, `.rp-dot`, `.workspace > .panel-insp`, `--free-l` / `--free-r` ("Inspector placement") | "Inspector placement", `inspPlace`; tpedit.js `freeSpan` |
| Panel width (the grip in the gap right of the dock: the tree panel and the inspector widen and narrow together, 300–600px, kept in `localStorage['ency.dockW']`; tree and inspector columns are shares, so they stretch; the inspector has a label | control divider like the tree, shown on hover, drag to resize) | `#dockWidth`, `#iwrap` / `#inspSplit` | `--dock-w`, `.dock-wgrip`, `.iwrap`, `.isplit-*`, `--insp-split` | "Panel width", `dockW`; "Inspector divider" |
| **Toolpath edits** (rail tab "Edits": list of Trim / Links / Feeds, 3D toolpath canvas, edit bar; the canvas shows on every tab but Simulation — the part while the Part filter is on, the toolpath (selected milling op, else the first) while the Toolpath filter `[data-fview=toolpath]` is on; Edits makes it editable) | `.rbtn[data-tab=Edits]`, `.tp-view`, `.tpe-bar` | `.tpe-*` ("Toolpath edits (tpedit.js)") | `tpedit.js`: `viewSync` / `shown`, `partOn` / `pathOn`, `evaluate`, `deriveLinks`, `beginEdit` / `commit` / `cancel` / `leave`, `barSync` |
| Drawing panel (shared; shown while drawing and while the inspector's Job tab is open, under the Filters, 4px below them, the grip under the lower panel; the Filters panel pattern: title "Draw" folds it, two columns wand · Line · Normal · Polyline · Spline, divider, Free | On Surface side by side) | `.ency-draw` | `shared-ui/drawbar.css`; placement `.viewport > .ency-draw` in app.css | `shared-ui/drawbar.js`: `ENCY_DRAWBAR.create`; tpedit.js `barPlace` |

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
