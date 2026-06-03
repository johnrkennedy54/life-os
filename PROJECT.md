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

### The five categories and their subcategories:
| Category | Subcategories |
|---|---|
| Work | Day to day, Certifications, Schooling, Advancement Plan |
| Health | Habit Tracking, Exercise Schedule, Appointments, Meal Prepping, Style, Advancement Plan |
| Apartment | Layout Blueprint, Item Manifest, Items Needed, Items Wanted, Advancement Plan |
| Finances | Overview, Monthly Budget, Credit Repair, Advancement Plan |
| Homelab | Day to day, Week to Week, Catch All |

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

---

## Current Status (v0.1)
### Working
- Full Express server with security middleware (helmet, CORS, rate limiting)
- JWT authentication — login, logout, session persistence
- Single-user registration lock (first account created locks the endpoint)
- REST API for entries — GET, POST, PUT, DELETE at `/api/entries/:pageKey`
- Frontend auth flow — login gate, register on first visit
- Subpage navigation — all 22 subcategories route correctly
- HTML content editor with live preview, character counter, Ctrl+S save
- Entries feed — timestamped cards, reverse chronological, Render/Edit/Delete
- Dark themed dashboard with sidebar, overview home page, category grid

### Known Issues / In Progress
- CSP `scriptSrcAttr` fix applied — inline onclick handlers now work
- npm install on fresh unzip requires explicit package list (node_modules not in zip)
- No rich text editor yet — users write raw HTML directly
- No URL routing — refreshing on a subpage returns to home overview
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

---

## Environment
- **Local URL:** http://localhost:3000
- **Project path:** ~/Desktop/Life OS/Raw Code/V0.1/life-os v.01
- **Database:** server/db/lifeos.db (gitignored)
- **Config:** .env (gitignored) — see .env.example for variables
- **Node version:** v24.x
- **npm version:** 10.x

---

## Priority List (What's Next)
1. Get the app fully working locally — stable, no errors
2. Build out actual content in subpages (trackers, tables, budgets)
3. Hook up GitHub for version control
4. Deploy online via Cloudflare Tunnel (homelab already exists)
5. Add rich text editor to replace raw HTML textarea
6. Add URL routing so refreshing works correctly
7. Multi-user accounts + invite system
8. SSO via Google or GitHub (Passport.js)

---

## Documents Generated This Session
| Document | Purpose |
|---|---|
| `life-os-setup-guide.docx` | Local setup + online deployment guide |
| `life-os-github-guide.docx` | Git + GitHub version control guide |
| `life-os-technical-docs.docx` | Full technical reference for the codebase |
| `life-os-credentials.docx` | Credentials tracker + change log |
| `life-os-changelog.docx` | Visual project changelog (all 25 entries) |

---

## Working With Claude
- Always update `CHANGELOG.md` after changes using `node scripts/changelog.js`
- Paste this file + `CHANGELOG.md` at the start of each new session
- State the session goal upfront — "I want to add X" or "this is broken, here's the error"
- Save error messages before closing the terminal — paste them exactly
- Prefer focused changes over large rewrites unless a refactor is the explicit goal

---

## Session History Summary
This project was built entirely in a single Claude session on June 3, 2026. It started as a concept (a Life OS dashboard prompt), evolved through a static HTML prototype, gained a proper Node.js backend, authentication system, REST API, and persistent database. All documentation was generated in the same session. The codebase is clean, functional locally, and ready for version control and eventual online deployment.

---

*Last updated: June 3, 2026 — jfkadmin*
*Life OS v0.1*
