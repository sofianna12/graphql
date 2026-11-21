# GraphQL Profile

A profile page for Zone01 Athens students. It shows your school data from the
platform's GraphQL API, with statistics graphs built from scratch in SVG.

**Live site:** https://sofianna12.github.io/graphql/

![Profile page](docs/screenshot.png)

## Features

- **Login** with `username:password` or `email:password` (Basic auth → JWT)
- Clear error messages for wrong credentials and network problems
- **Logout**, and automatic logout when the session expires
- **Profile sections**
  - User identification: name, login, email, campus, join date
  - Progress: level, total XP and recent XP
  - Audits: audit ratio, done (with bonus) and received, with SVG bars
- **Statistics (SVG, no chart library)**
  - XP over time (line chart)
  - XP by project, top 10 (bar chart)
  - Tooltips with mouse, touch and keyboard (← → Home End)
- Loading skeletons, error state with retry, empty states
- Responsive down to 320px, dark mode, accessible (ARIA labels, keyboard focus)

## How it works

```
Browser ──Basic auth──▶ /api/auth/signin ──▶ JWT (saved in localStorage)
Browser ──Bearer JWT──▶ /api/graphql-engine/v1/graphql ──▶ your data
```

1. The login form sends `base64(identifier:password)` to the signin endpoint and gets a JWT.
2. The user id is read from the JWT payload (`sub`). Its `exp` decides if the session is still valid.
3. Three GraphQL queries run in parallel, and pure functions turn the results into the numbers and graphs.

### GraphQL queries

All queries are in [`js/queries.js`](js/queries.js).

| Type | Query | Example |
|---|---|---|
| **Normal** | `USER_QUERY` | `user { id login campus auditRatio ... }` |
| **With arguments** | `XP_QUERY` | `transaction(where: { userId: { _eq: $userId }, type: { _eq: "xp" } }, order_by: { createdAt: asc })` |
| **Nested** | `PROGRESS_QUERY` | `progress { grade object { name type } }` |

Other details:

- `attrs(path: "firstName")` downloads only the needed fields of the `attrs` JSON, never private data such as phone or address.
- Aliases (`projects:`, `level:`) get two lists in one request.

### How the numbers are calculated

Every value matches the platform dashboard:

| Value | Source |
|---|---|
| Total XP | sum of `xp` transactions where `event.path = "/athens/div-01"` (piscines excluded) |
| Level | highest `level` transaction of div-01 |
| Audit ratio | `user.auditRatio`, one decimal |
| Done / bonus | `totalUp - totalUpBonus`, and `totalUpBonus` |
| Received | `user.totalDown` |
| Pass / fail | `progress` of projects: `grade >= 1` pass, `grade < 1` fail, `null` not graded yet |

Sizes use base 1000 and 3 significant digits, like the platform: `906900` → `907 kB`.

## Project structure

```
index.html          login view and profile view
css/style.css       design tokens (light/dark), layout, charts
js/
  app.js            starts the app, login/logout, loads the profile
  api.js            signin() and graphql() requests, error handling
  auth.js           JWT storage, decoding and expiry check
  queries.js        all GraphQL queries
  data.js           pure functions: totals, formatting, statistics
  dom.js            h() and svg() helpers that build elements safely (no innerHTML)
  profile.js        the profile sections
  charts.js         generic SVG line and bar charts with tooltips
tests/              unit tests for data.js and charts.js
```

## Run locally

No install and no build step. ES modules need a web server, so opening
`index.html` directly from the file system does not work.

```bash
git clone https://github.com/sofianna12/graphql.git
cd graphql
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Tests

Uses the test runner built into Node.js (version 18 or newer):

```bash
node --test
```

## Deploy

The site is hosted on GitHub Pages from the `main` branch. To publish a new version:

```bash
git push github main
```

## Author

Anna Sofia ([@asofia](https://platform.zone01.gr/git/asofia)) · Zone01 Athens
