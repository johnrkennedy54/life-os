# Life OS — Project Brief
> Paste this file at the start of every Claude session for full project context.
> Keep it updated as the project evolves.

---

## Who I Am
- **Username:** jfkadmin
- **OS:** Linux (Ubuntu)
- **Editor:** VS Code
- **Technical level:** Intermediate — comfortable with concepts, not an expert. Explain the *what* and *why* of changes briefly but don't over-explain basics.
- **Preferred working style:** Show me the change and give a short summary. I don't need a line-by-line breakdown unless something is complex or I ask.

---

## What Life OS Is
A personal, single-user, all-in-one life management dashboard. Not just a notes app — the goal is a unified system covering every area of life in one place. Currently runs locally, with plans to deploy online for access from anywhere.

### Categories and subcategories:
Categories and subcategories are now user-configurable. The default set is:

| Category | Subcategories |
|---|---|
| Work | Day to day, Certifications, Schooling, Advancement Plan |
| Health | Habit Tracking, Exercise Schedule, Appointments, Meal Prepping, Style, Advancement Plan |
| Apartment | Layout Blueprint, Item Manifest, Items Needed, Items Wanted, Advancement Plan |
| Finances | Overview, Monthly Budget, Credit Repair, Advancement Plan |
| Homelab | Day to day, Week to Week, Catch All |

Custom categories and subcategories can be added, edited, and deleted. Category order in the sidebar is drag-to-reorder and persists to localStorage.

---

## Current Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js v24 |
| Framework | Express |
| Database | SQLite via sql.js (pure JS, no native binaries) |
| Auth | JWT in httpOnly cookies, bcrypt passwords |
| Frontend | Vanilla HTML / CSS / JS — no framework, no bundler |
| Fonts | Plus Jakarta Sans (UI), DM Mono (code/labels) |
| Theme | Dark, minimal, noise texture, per-category accent colors |
| Layout state | localStorage (module layouts, category order, finance data) |

---

## Current Status (v0.2)
### Working
- Full Express server with security middleware (helmet, CORS, rate limiting)
- JWT authentication — login, logout, session persistence
- Single-user registration lock (first account created locks the endpoint)
- REST API for entries — GET, POST, PUT, DELETE at `/api/entries/:pageKey`
- Frontend auth flow — login gate, register on first visit
- Sidebar navigation — all default subcategories route correctly
- **Drag-to-reorder sidebar categories** — mouse-based drag, persists to localStorage
- **Custom categories and subcategories** — create with name + color picker, edit/delete, appear in sidebar and home grid
- **Modular subpage layout system** — every subpage has a drag-and-drop module grid (auto-fit, evenly spaced). Default: 1 wide + 4 normal empty slots
- **Module types:** Content Editor (HTML editor + entries feed), Notes (auto-save textarea), Checklist (add/check/delete items)
- **Module picker modal** — "+ Add module" opens a styled modal showing available module types from the library
- **Finance Overview dashboard** (Finances › Overview is a dedicated page, not the standard editor):
  - SVG P&L line chart — auto-calculated from Budget module, last 12 months
  - Accounts module — CRUD for up to 4+ bank accounts (name, type, institution, balance)
  - Credit Score module — score display with 300–850 rating bar
  - Budget module — monthly income + expense rows, net calculation, feeds P&L chart
  - Payment Schedule — recurring bills with per-month paid/unpaid tracking
  - Add-on modules: Savings Goal, Debt Payoff, Custom Note
- **Module Overview** — sidebar footer tab showing a full catalog of all module types (General, Finance built-ins, Finance add-ons, active custom instances)
- **Changelog script** — `node scripts/changelog.js` (interactive) or `node scripts/changelog.js v0.2 TYPE "Title" "Desc" "files"` (CLI args, non-interactive)
- Dark themed dashboard with sidebar, overview home page, category grid

### Known Issues / In Progress
- No URL routing — refreshing on a subpage returns to home overview
- Finance dashboard data stored in localStorage only (not backed by the database)
- Module layouts stored in localStorage (not synced to server)
- No rich text editor — Content Editor module uses raw HTML
- No search across entries
- No password change UI

### Not Started Yet
- Online deployment (Cloudflare Tunnel or VPS)
- Multi-user accounts
- SSO (Google / GitHub OAuth via Passport.js)
- Rich text editor (Tiptap or Quill planned)
- Full-text search
- Automated database backups
- Mobile-responsive layout
- Migrating localStorage data (finance, layouts) to the database

---

## Key Decisions Already Made
| Decision | Reason |
|---|---|
| sql.js over better-sqlite3 | better-sqlite3 requires native compilation which failed in the build environment. sql.js is pure JS and works everywhere. |
| Single-user for now | Simpler auth, faster to build. Multi-user support is planned but not needed yet. |
| No frontend framework | Keeps the project simple and educational. No build step, no bundler, just files. |
| httpOnly JWT cookies | More secure than localStorage for token storage — not accessible to JavaScript. |
| Vanilla JS over React/Vue | Reduces complexity. The app doesn't need reactivity at this scale yet. |
| Plus Jakarta Sans font | Clean geometric sans, open source, readable at small sizes. Replaces DM Sans + Syne. |
| localStorage for layout/finance data | Fast to build, no schema changes needed. Will migrate to DB in a future version. |
| Mouse-based drag for modules | HTML5 drag API conflicts with CSS auto-fit grids — causes reflow during drag. Mouse events give full control. |
| Finance Overview as a dedicated page | The finance dashboard is complex enough to warrant its own page rather than using the standard module grid. |

---

## Environment
- **Local URL:** http://localhost:3000
- **Project path:** ~/Desktop/Life OS/Raw Code/V0.1/life-os v.01
- **Database:** server/db/lifeos.db (gitignored)
- **Config:** .env (gitignored) — see .env.example for variables
- **Node version:** v24.x
- **npm version:** 10.x
- **GitHub:** https://github.com/johnrkennedy54/life-os.git

---

## Priority List (What's Next)
1. Build out content in subpages using the module system
2. Deploy online via Cloudflare Tunnel (homelab already exists)
3. Migrate localStorage data (finance dashboard, module layouts) to SQLite
4. Add URL routing so refreshing on a subpage works correctly
5. Rich text editor module (Tiptap or Quill) to replace raw HTML textarea
6. Multi-user accounts + invite system
7. SSO via Google or GitHub (Passport.js)
8. Full-text search across entries
9. Mobile-responsive layout

---

## Working With Claude
- Always update `CHANGELOG.md` after changes using `node scripts/changelog.js`
  - Interactive: `node scripts/changelog.js`
  - Non-interactive: `node scripts/changelog.js v0.2 FEAT "Title" "Description" "files"`
- Paste this file + `CHANGELOG.md` at the start of each new session
- State the session goal upfront — "I want to add X" or "this is broken, here's the error"
- Save error messages before closing the terminal — paste them exactly
- Prefer focused changes over large rewrites unless a refactor is the explicit goal

---

## Session History Summary
- **v0.1 (June 3, 2026):** Project built from scratch — Node.js + Express + sql.js backend, JWT auth, REST API for entries, dark-themed dashboard with sidebar, category grid, HTML editor with live preview and entries feed. All infrastructure, documentation, and GitHub setup completed in one session.
- **v0.2 (June 3, 2026):** Major UI overhaul — drag-to-reorder sidebar, custom categories/subcategories, Finance Overview dashboard (P&L chart, accounts, credit, budget, payments, add-ons), Module Overview library, full modular subpage layout system (drag-and-drop modules, auto-fit even spacing), module picker modal. Committed and pushed to GitHub.

---

*Last updated: June 3, 2026 — jfkadmin*
*Life OS v0.2*
