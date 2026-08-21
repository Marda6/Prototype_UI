# ENCY UI — interface prototypes

Static prototypes of the ENCY interface (CAM/CNC, ENCY Core dark theme).
No build step or dependencies: HTML, CSS and a bit of vanilla JS.

**Demo:** https://encysoftware.github.io/ENCY_UI/

Target screen: 1920×1080 at 125% system scale → working area of **1536×864** CSS px.

## Structure

```
ENCY_UI/
├── index.html                     # hub: list of sections
├── packages/
│   ├── shared-ui/                 # application shell — shared by all sections
│   │   ├── tokens.css             #   colors, typography, reset
│   │   ├── chrome.css             #   title bar, sidebar, content container, page header
│   │   ├── chrome.js              #   shell markup + section registry + behavior
│   │   └── assets/                #   icons (SVG/PNG)
│   ├── license-manager/           # section: licenses and extensions
│   │   ├── index.html             #   only <main class="content">
│   │   ├── app.css                #   only its own styles
│   │   └── app.js                 #   only its own logic
│   └── extension-store/           # section: extension catalog and Manage
└── tools/dev-server.js            # local server with auto-reload
```

The rule is simple: **the shell lives in `shared-ui`, section content lives in its own folder.**
A section does not override shell styles; if something is missing, it gets added
to `shared-ui` once for everyone.

## Running locally

```bash
node tools/dev-server.js
```

Opens at `http://localhost:5584/` (change the port with `PORT=6000 node tools/dev-server.js`).
The server serves the repository as is, so paths behave exactly the same as on Pages.
No build is needed: `packages/license-manager/index.html` can also be opened as a file in the browser.

## Checking out a single section

A section needs the shell, so a checkout always includes two folders: `shared-ui` and the section itself.

```bash
git clone --filter=blob:none --no-checkout https://github.com/EncySoftware/ENCY_UI.git
cd ENCY_UI
git sparse-checkout init --cone
git sparse-checkout set packages/shared-ui packages/license-manager
git checkout main
```

`--filter=blob:none` is a partial clone: files of the other sections are not downloaded at all.
To add another section later: `git sparse-checkout add packages/extension-store`.

Sidebar links to the neighboring sections will remain: locally they return 404,
on Pages they work. This is expected — there is one shell for all sections.

## How to add a new section

1. Copy any section's folder to `packages/<new-id>` and clean out the contents of
   `index.html` (keep `<main class="content">`), `app.css`, `app.js`.
2. In `index.html`, update `window.ENCY_APP = {id: "<new-id>"}` and `<title>`.
3. Add an entry to the `SECTIONS` registry in `packages/shared-ui/chrome.js` — it drives
   the sidebar item and the `../<id>/` link.
4. Add a card to the root `index.html`.

The section `id` = folder name. Links between sections are always relative (`../<id>/`),
so they work the same on `encysoftware.github.io/ENCY_UI/` and in a local clone.

Nested sections (e.g. screens inside an open project) are laid out the same way —
as a `packages/project-<something>` folder; the shared shell does not change.

## Conventions

- No build step and no external dependencies: a prototype must open from a file.
- All sizes and colors come from `shared-ui/tokens.css` tokens, no "magic" values.
- Code comments answer "why", not "what".
- Prototype data is made up but covers every interface state: this way
  a developer never has to guess what an expired license or an empty list looks like.
