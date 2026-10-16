# License manager

License management section: current license card with an `Upgrade` mode,
license tables grouped by customer and the `Extensions` tab.

Files: `index.html` — content markup, `app.css` — section styles, `app.js` — data and logic.
The window shell comes from `../shared-ui`.

Terms follow Dealer Space: `Products`, `Modules`, `Duration`; tables are grouped by the dealer’s
client the license is issued to (not the dealer). The `Licensee` label stays in the card and sidebar.

## What the prototype shows

- **Current license card** — product package, licensee, contents (`Modules`), duration and
  maintenance. The `Upgrade` button enables edit mode: picking a higher package, adding modules,
  `Save changes` starts a trial period, `Request upgrade` sends a request to the dealer,
  `Reset changes` returns the license to its original state.
- **Support** — in the card: the dealer providing technical support. A click on the info icon next to it
  opens the dealers' contacts (email, phone, website): the support dealer, then — divided — the
  one who issued the license; one block when it is the same dealer. `?dealers=one` shows that case.
- **Tables** — grouped by customer; all states are deliberately included:
  `Current`, `Valid`, `Invalid`, `Sign in required`, `Pending restart`, `Perpetual`,
  an expired term (`Expired`, the row is marked red) and lapsed maintenance.
- **Duration / Maintenance** — two lines: the full term (`1 year`) or the end date
  (`30-Jun-2027`) on top, what is left below (`13d left`, `11m 4d left`, `1y 2m left`).
  The card shows the same on one line: `1 year · 6m 15d left`.
- **Activate / Release** — activation only applies after restarting ENCY:
  the row gets `Pending restart`, a notification appears on top, the current license stays.
- **Show expired** — expired licenses are hidden by default.
- **Online / Offline** in the title bar — a temporary prototype toggle: shows how
  `Account`-protected licenses behave without a network.

## Data

All rows live in `LICENSES` at the top of `app.js`:
`remaining` — days (`null` = perpetual, `0` = term expired), `term` — the full duration as sold,
`maint` — maintenance end date (past = lapsed, `null` = no maintenance), `status` — row state,
`dealer` / `issuer` — who supports and who issued the license; their contacts live in `DEALERS`.
Dates are counted from the prototype's fixed `TODAY`.
