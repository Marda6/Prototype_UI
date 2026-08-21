# License manager

License management section: current license card with an `Upgrade` mode,
license tables grouped by licensee and the `Extensions` tab.

Files: `index.html` — content markup, `app.css` — section styles, `app.js` — data and logic.
The window shell comes from `../shared-ui`.

## What the prototype shows

- **Current license card** — product package, contents (`Included`), term and maintenance.
  The `Upgrade` button enables edit mode: picking a higher package, adding modules,
  `Save changes` starts a trial period, `Request upgrade` sends a request to the dealer,
  `Reset changes` returns the license to its original state.
- **Tables** — grouped by licensee; all states are deliberately included:
  `Current`, `Valid`, `Invalid`, `Sign in required`, `Pending restart`, `Perpetual`,
  an expired term (`Expired`, the row is marked red) and lapsed maintenance.
- **Activate / Release** — activation only applies after restarting ENCY:
  the row gets `Pending restart`, a notification appears on top, the current license stays.
- **Show expired** — expired licenses are hidden by default.
- **Online / Offline** in the title bar — a temporary prototype toggle: shows how
  `Account`-protected licenses behave without a network.

## Data

All rows live in `LICENSES` at the top of `app.js`:
`remaining` — days (`null` = perpetual, `0` = term expired), `maint` — maintenance end
date (past = lapsed, `null` = no maintenance), `status` — row state.
