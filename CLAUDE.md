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
| Operation status panel | `#statusPanel` (`.stpanel`) | `.stp-*` | "Status panel", `stpApply` |
| **NC block panel** (block window on the Simulation tab) | `#ncPanel` (`.stpanel.ncpanel`) | `.ncpanel`, `.ncp-*` | "NC block panel", `ncShow`, `ncSync`, `ncFollow`, `ncSetEdit` |
| Simulation code tree | `#simTree`, rows `.simrow` | `.simrow`, `.sim-*` | `simRender` |
| Simulation control bar + timeline | `#simBar`, `#simTl` | `.simbar`, `.sb-*`, `.tl-*` | "the control bar", `simTick`, `simTlSync` |
| Compact (docked) sim controls | `#simDock` | `.sim-dockbar`, `.sd-*` | `sdUndock` |
| Single-operation mode | `#singleOp` | `.singleop`, `.so-*` | "single-operation mode" |
| Simulation popovers (settings, stop conditions, collision list) | `#simPop`, `#stopsPop`, `#collPop` | `.simpop`, `.sp-*`, `.coll-*` | `spOpen`, `collListRender` |
| Filters panel on the 3D view | `#filters` | `.filters` | — |
| Inspector (bottom-left) | `.irows`, `.irow` | `.irow`, `.ictl`, `.dropdown` | "Inspector" |

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
