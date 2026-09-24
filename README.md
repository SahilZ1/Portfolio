# Sahil Zagade — Portfolio & Analytics Platform

A cybersecurity portfolio that is itself the portfolio piece.

The public site is an animated React application. Behind it runs a first-party
web analytics platform built from scratch on Node.js, Express and PostgreSQL:
anonymous visitor identity, server-side session reconstruction, page-view and
event ingest, visitor-journey analysis, and a private admin console with
AI-assisted commentary.

There is no Google Analytics. There is no third-party script of any kind. No
external network request is made from any page.

---

## Contents

- [Why it is built this way](#why-it-is-built-this-way)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Analytics architecture](#analytics-architecture)
- [Cookie architecture](#cookie-architecture)
- [Authentication](#authentication)
- [Security decisions](#security-decisions)
- [Privacy decisions](#privacy-decisions)
- [AI architecture](#ai-architecture)
- [Cyber Lab safety model](#cyber-lab-safety-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Filling in your content](#filling-in-your-content)

---

## Why it is built this way

Adding an analytics tag to a portfolio proves nothing. Building the analytics
proves quite a lot: a data model, a schema with an indexing strategy, an ingest
API that accepts untrusted input, an authenticated console, and a set of
privacy trade-offs made deliberately rather than inherited from a vendor.

Every design decision in this repository is documented at the point it was
made, in the file where it applies — including the ones that cost something.

---

## Architecture

```
                         ┌──────────────────────┐
   Visitor ────────────► │  React SPA (Vite)    │
                         │  portfolio + console │
                         └──────────┬───────────┘
                                    │ same-origin fetch
                                    │ (HttpOnly cookie travels automatically)
                         ┌──────────▼───────────┐
                         │  Express 5           │
                         │  helmet · CSP · CORS │
                         │  rate limiting       │
                         └──────────┬───────────┘
                    ┌───────────────┼────────────────┐
                    │               │                │
         ┌──────────▼─────┐ ┌───────▼───────┐ ┌──────▼──────────┐
         │ /api/track     │ │ /api/admin/   │ │ /api/health     │
         │ PUBLIC ingest  │ │ auth          │ │ /robots.txt     │
         │ validated      │ │ bcrypt + PG   │ │ /sitemap.xml    │
         │ rate limited   │ │ sessions      │ │                 │
         └──────────┬─────┘ └───────┬───────┘ └─────────────────┘
                    │               │
         ┌──────────▼───────────────▼──────────┐
         │  Service layer                      │
         │  tracking · analytics · auth        │
         │  userAgent · referrer · insights    │
         └──────────────────┬──────────────────┘
                            │ parameterised SQL only
                 ┌──────────▼──────────┐
                 │   PostgreSQL 18     │
                 │  visitors           │
                 │   └─ sessions       │
                 │       ├─ page_views │
                 │       └─ events     │
                 │  admin_users        │
                 │  session (store)    │
                 │  ai_insight_cache   │
                 └──────────┬──────────┘
                            │ aggregation (counts, rates, ranked lists)
                 ┌──────────▼──────────┐
                 │  Admin console      │
                 │  /admin (private)   │
                 └──────────┬──────────┘
                            │ aggregates only — never rows
                 ┌──────────▼──────────┐
                 │  AI provider        │
                 │  OPTIONAL           │
                 │  output verified    │
                 │  against source     │
                 └─────────────────────┘
```

Fuller detail, including the authentication flow as a separate diagram, is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 24, Express 5 | Already working; the right tool. Not replaced for fashion. |
| Database | PostgreSQL 18 | JSONB for event metadata, GIN indexes, `generate_series` for gap-free time series, real constraints. |
| Migrations | Hand-rolled SQL runner | Forward-only, transactional, checksum-verified. An ORM's migration layer would be the only part of an ORM used. |
| Frontend | React 19 + Vite | Fast builds, small bundles, no framework lock-in on the API. |
| Routing | React Router 7 | |
| Animation | Framer Motion | The only animation dependency. ~42 kB gzipped for the whole motion system. |
| Charts | **None — hand-built SVG** | See below. |
| Validation | Zod | Schema validation on every untrusted ingest path. |
| Auth | bcrypt + express-session + connect-pg-simple | Standard primitives. No custom cryptography anywhere. |
| Tests | Vitest + Supertest | Against a real PostgreSQL database, not mocks. |

### Why no chart library

Recharts and Chart.js are each roughly 100–200 kB for what amounts to five
chart types. The charts here are a few kB of hand-written SVG, and:

- the palette is the markup, rather than a theming layer to fight;
- the visitor-journey Sankey has to be custom regardless — no general-purpose
  chart library draws it;
- each chart ships a real `<table>` for screen readers, which most libraries
  do not.

### Why React + Vite rather than Next.js

Next.js would mean either running two servers, or migrating the Express API
into Next route handlers — discarding the backend work that is the point of
this project. SEO for ~15 known routes is handled with per-route metadata, a
real sitemap, and structured data. If rich per-project link previews on
non-JS-executing unfurlers become important, the next step is prerendering the
route set at build time, not a framework change.

---

## Project structure

```
Portfolio/
├── src/                          Express API
│   ├── config/index.js           All env access, validated once at boot
│   ├── db/
│   │   ├── database.js           THE connection pool (one per process)
│   │   ├── migrate.js            Forward-only migration runner
│   │   └── migrations/*.sql      Schema history
│   ├── middleware/
│   │   ├── visitorTracker.js     Anonymous cookie. No I/O.
│   │   ├── requireAdmin.js       Auth guard + CSRF + session rotation
│   │   ├── rateLimit.js          Three tiers: login / tracking / api
│   │   └── errorHandler.js       Never leaks stack traces or SQLSTATEs
│   ├── routes/
│   │   ├── health.js             GET /api/health
│   │   ├── track.js              Public ingest (the main attack surface)
│   │   ├── auth.js               Admin login/logout/session
│   │   ├── analytics.js          Private analytics API
│   │   └── seo.js                robots.txt, sitemap.xml
│   ├── services/
│   │   ├── trackingService.js    Ingest: visitor → session → view → event
│   │   ├── analyticsService.js   Aggregation: every dashboard query
│   │   ├── authService.js        bcrypt, lockout, timing-safe failures
│   │   ├── userAgent.js          UA → 3 coarse families, then discarded
│   │   ├── referrer.js           Referrer → attribution bucket
│   │   ├── aiProvider.js         Provider abstraction (optional)
│   │   └── insightsService.js    Snapshot, rules, output verification
│   ├── app.js                    App factory (testable, no port binding)
│   └── server.js                 Lifecycle: boot, maintenance, shutdown
│
├── client/                       React SPA
│   └── src/
│       ├── content/              ← YOUR CONTENT LIVES HERE
│       ├── components/           Shared UI
│       ├── pages/                Public routes
│       ├── admin/                Console (separate lazy chunk)
│       ├── lib/                  analytics client, api client, motion
│       └── styles/               Design tokens + component styles
│
├── scripts/
│   ├── create-admin.js           Interactive, password never echoed
│   └── prune.js                  Enforce the retention window
│
├── tests/                        116 tests against a real database
└── docs/                         Architecture, security, analytics, deployment
```

---

## Getting started

### Prerequisites

- Node.js 20+ (developed on 24)
- PostgreSQL 16+ (developed on 18)

### Setup

```bash
# 1. Install
npm install
npm --prefix client install

# 2. Configure
cp .env.example .env
#    Edit .env: set DB_PASSWORD, and generate a SESSION_SECRET with
#    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Create the database
createdb portfolio_analytics

# 4. Apply the schema
npm run db:migrate

# 5. Create your admin account (prompts; password is not echoed)
npm run admin:create

# 6. Run
npm run dev
```

`npm run dev` starts both processes:

- **http://localhost:5173** — the site, with hot reload (use this one)
- **http://localhost:3000** — the API

Vite proxies `/api` to the backend, so the browser stays on a single origin and
cookies behave in development exactly as they will in production.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | API + frontend with hot reload |
| `npm run dev:api` | API only (nodemon) |
| `npm run build` | Production build of the client |
| `npm start` | Production server, serving the built client |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migrate:status` | Show applied / pending / drifted |
| `npm run db:prune` | Enforce the retention window now |
| `npm run admin:create` | Create or reset the admin account |
| `npm test` | Full suite |
| `npm run test:watch` | Watch mode |

---

## Environment variables

Every variable is documented inline in [`.env.example`](.env.example). The ones
that matter most:

| Variable | Notes |
|---|---|
| `SESSION_SECRET` | **Required in production.** ≥32 chars. The app refuses to boot without it, and refuses to boot with the dev placeholder. |
| `DATABASE_URL` | Takes precedence over `DB_*`. Managed providers hand out one of these. |
| `DB_SSL` | `true` for managed PostgreSQL. |
| `TRUST_PROXY` | Hop count, **not** `true`. See [Security decisions](#security-decisions). |
| `SITE_URL` | Public origin. Drives canonical URLs, the sitemap, and internal-referrer detection. |
| `AI_PROVIDER` | `none` by default. Everything works without it. |

`.env` is git-ignored. `.env.example` contains only placeholders.

---

## Database

### Schema

```
visitors                          One per browser profile
  id, visitor_uuid (UNIQUE)       Random v4 UUID — the cookie value
  first_seen, last_seen
  session_count                   Makes "returning" answerable without a join

sessions                          One visit; ends after 30 min inactivity
  id, session_uuid (UNIQUE)
  visitor_id → visitors           ON DELETE CASCADE
  started_at, last_activity, ended_at
  entry_page, exit_page
  referrer, referrer_host, traffic_source
  device_category, browser_family, os_family   ← coarse families only
  is_bot                          Every reported figure filters on this
  page_view_count, event_count    Denormalised; removes correlated subqueries

page_views
  id, session_id → sessions
  path, page_title, viewed_at
  view_sequence                   1-based position in the visit
  duration_seconds                NULL on the last view = the exit signal

events
  id, session_id → sessions
  event_type (VARCHAR 64)         Validated against a fixed list
  page_path, event_data (JSONB)   Flat, ≤12 primitive keys
  created_at

admin_users                       bcrypt hash, lockout state
admin_login_attempts              Audit trail; IPs stored as keyed hashes
session                           connect-pg-simple store
ai_insight_cache                  Keyed on a digest of the aggregate input
```

Note: `sessions.user_agent` existed in the original schema and was **dropped**
in migration 002. A full User-Agent is a meaningful fingerprinting component,
and the dashboard only ever needs three coarse answers from it. Those are
derived at ingest and the raw string is discarded.

### Indexes

31 indexes, each justified by a query the dashboard actually runs. The partial
indexes (`WHERE is_bot = FALSE`) only cover human traffic, because every
reported figure excludes bots. See
[`003_analytics_indexes.sql`](src/db/migrations/003_analytics_indexes.sql).

### Migrations

Forward-only, transactional, checksum-verified. Editing an already-applied
migration is refused at runtime — the fix is always a new forward migration.
Down-migrations are deliberately not supported: rolling back a column drop
cannot bring the data back.

---

## Analytics architecture

```
Browser                    Server                         PostgreSQL
───────                    ──────                         ──────────
route change
  └─► POST /api/track/pageview
         ├─ rate limit (120/min per IP)
         ├─ body ≤ 4 kb
         ├─ zod schema: path normalised, query string stripped
         ├─ visitor UUID read from HttpOnly cookie (never the body)
         └─► trackingService.recordPageView()   ── one transaction ──►
               ├─ upsert visitor (ON CONFLICT, single round trip)
               ├─ resolve session (30-min window) or open a new one
               ├─ close previous view's dwell time
               ├─ insert page view with next sequence number
               └─ update session: exit_page, counters, last_activity
```

**The middleware does no database work.** The original implementation wrote to
PostgreSQL on every HTTP request — including every asset, font and favicon
probe — so one page load produced dozens of writes and rewrote `last_seen` from
asset traffic. All database work now belongs to the ingest endpoints, which run
once per real navigation.

**A returning visitor stays the same visitor.** A new session is opened when the
previous one goes stale, but it attaches to the existing visitor row via the
cookie. That is what makes the returning-visitor figure mean anything.

What is measured: unique visitors, sessions, page views, typed events, entry
and exit pages, traffic-source attribution, referring hosts, device/browser/OS
families, page-to-page transitions, common journeys, session duration, bounce
rate, returning-visitor rate, outbound click destinations.

---

## Cookie architecture

Two cookies, one origin, opposite jobs — and therefore different settings.

### `portfolio_visitor`

| Setting | Why |
|---|---|
| `HttpOnly` | The tracking client never reads it; the cookie travels automatically on a same-origin fetch. Exposing it to the DOM would only hand an XSS payload a stable cross-visit identifier. |
| `SameSite=Lax` | Sent on top-level navigations, so arriving from LinkedIn is attributed correctly. **Strict would silently destroy attribution** — the visitor would be issued a second identifier and counted as new. |
| `Secure` (prod) | Never transmitted in cleartext. Off locally because localhost is HTTP. |
| `Max-Age` 365d | Long enough for returning-visitor analysis; not permanent. |
| unsigned | The value is a random v4 UUID with no meaning. A forged one creates a junk row and nothing more. |

The value comes from `crypto.randomUUID()` — the platform CSPRNG. It is derived
from **nothing** about the visitor: no IP, no User-Agent, no canvas, no clock
skew.

### `portfolio_admin_sid`

| Setting | Why |
|---|---|
| `HttpOnly` | Unreachable from JavaScript. |
| `SameSite=Strict` | This one authorises access, so it must never travel cross-site at all. Acceptable here precisely because `/admin` is never linked to from anywhere. |
| `Secure` (prod) | |
| 8h rolling | Server-side state in PostgreSQL; destroyed on sign-out, not merely cleared. |
| custom name | Not `connect.sid`, which advertises the framework in response headers. |

---

## Authentication

```
POST /api/admin/auth/login
  ├─ rate limit: 8 failures / 15 min per IP (successes not counted)
  ├─ bound username ≤64, password ≤200   ← before bcrypt, so a client
  │                                         cannot buy expensive CPU time
  ├─ look up user
  │    ├─ not found  → compare against a DUMMY bcrypt hash, then fail
  │    ├─ locked     → compare against dummy hash, then fail
  │    └─ found      → bcrypt.compare
  ├─ on failure: increment per-account counter, lock at 10 for 15 min,
  │              write the reason to the audit table, return ONE generic error
  └─ on success: regenerate session id  ← session-fixation defence
                 issue CSRF token
                 reset counters
```

**No account creation endpoint exists.** A self-service registration route on an
admin console is an open door, and "first user to register wins" is a race
anyone who finds the site early can win. Accounts are created by
`npm run admin:create`, which requires shell access to the server, reads the
password with echo disabled, and stores only the bcrypt hash.

**Timing-safe failure.** A username that does not exist returns in microseconds
if it skips hashing, while a real one costs ~250 ms of bcrypt work. That
difference is measurable over a network and is a working enumeration oracle
regardless of how carefully the error message is worded. Every failure path
performs an equivalent bcrypt comparison. There is a test that measures the
ratio.

---

## Security decisions

### Content Security Policy

Built from deny-all (`useDefaults: false`) rather than relaxed from a default:

- `script-src 'self'` — **no `'unsafe-inline'`, no `'unsafe-eval'`** in
  production. This is the control that actually blunts XSS, and it is the one
  most deployed policies give away. A Vite production build emits external
  script files only, so the exemption was never needed.
- `connect-src 'self'` — arguably the highest-value directive here. Even after
  successful script injection, a payload cannot POST collected data to an
  attacker-controlled host.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`.
- `style-src` **does** allow `'unsafe-inline'`. React and Framer Motion set
  inline styles for animated transforms. Inline styles cannot execute code, so
  the residual risk is CSS exfiltration and UI redressing rather than script
  execution. The trade was taken deliberately and is recorded rather than left
  silent.

### `trust proxy` is a number, never `true`

`app.set('trust proxy', true)` makes Express believe any client-supplied
`X-Forwarded-For`. An attacker then rotates a header field and every IP-keyed
rate limit becomes decorative. `TRUST_PROXY` is a hop count.

### Injection

Every statement is parameterised. Time windows use
`make_interval(days => $1::INT)` rather than string-concatenated SQL. Ingest
paths are normalised and length-bounded before they reach the database. There
is a test that posts an injection-shaped path and asserts it is stored as an
inert literal.

### Error responses

A production client never receives a stack trace, a SQL fragment, or a driver
error code. An earlier version of the error handler forwarded `error.code`,
which meant PostgreSQL SQLSTATEs like `42883` reached the client — free schema
reconnaissance. `code` is now forwarded only for errors the application
constructed itself. There is a test for it.

### Logging

The logger redacts by key (`password`, `secret`, `token`, `cookie`,
`authorization`, …) at any depth, and truncates pseudonymous identifiers to an
8-character prefix. The original implementation logged full visitor UUIDs on
every request, putting a long-lived tracking identifier into plaintext logs.

### Other

Rate limiting in three tiers · Helmet · request size caps (4 kb ingest, 2 kb
login) · `rel="noopener noreferrer"` on every outbound link · graceful shutdown
draining the pool · production boot refusing dev secrets.

Full detail: [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Privacy decisions

**Never collected:** raw IP addresses (used transiently in memory for rate
limiting only) · full User-Agent strings · any device fingerprint (no canvas,
WebGL, audio, font enumeration or hardware probing) · location at any
resolution · any cookie this site did not set · any personal information.

**Honoured:** Do Not Track and Global Privacy Control. If either signal is
present the tracking client returns before making any request. Most commercial
analytics ignores these; honouring them costs one condition.

**Opt-out:** one button on `/privacy` that actually clears the identifier
server-side. No dark patterns, no consent wall — the disclosure strip is
dismissible and dismissing it grants nothing, because nothing further is being
asked for.

**Retention:** 400 days, enforced by a scheduled prune job that deletes expired
visitor rows and cascades. A retention policy that is documented but never
executed is not a policy.

**Honest limits**, stated on `/privacy` rather than buried: the identifier is
*pseudonymous*, not anonymous; the figures under-count returning visitors
because we refuse to fingerprint; the host keeps its own request logs outside
this application's control; and none of it is a claim of legal compliance with
any particular regime.

---

## AI architecture

```
PostgreSQL → aggregation → snapshot → [ deterministic rules ] → insights
                              │
                              └─────► [ AI provider (optional) ]
                                             │
                                      output verification
                                             │
                                      insights (or discarded)
```

Three properties, each with tests:

1. **The application works with no AI key.** `AI_PROVIDER=none` is the default,
   and the console shows deterministic rule-based insights that are genuinely
   useful on their own. Nothing degrades.

2. **Only aggregates leave the server.** `buildSnapshot()` produces counts,
   rates, labels and internal page paths. No visitor UUID, no session, no
   referrer URL, no cookie, no credential, no row-level record. The snapshot is
   the complete set of data that can reach a provider, constructed in one place
   so the boundary is auditable — and exposed at
   `/api/admin/analytics/insights/snapshot` so you can read exactly what would
   be sent before enabling anything.

3. **Numbers come from SQL, never from the model.** Every generated insight is
   checked against the snapshot, and any sentence containing a figure that is
   not in the source data is discarded before it reaches the screen. A model
   that invents a statistic gets its output dropped, not published. If
   validation rejects everything, the console falls back to the rules.

Provider failures, timeouts and unparseable output all fall back silently.

---

## Cyber Lab safety model

The `/lab` section publishes **write-ups only** — prose, findings and
remediation. It contains no exploitable endpoint and no code path a visitor can
trigger.

```
PUBLIC  (this site)         the finding, the fix, the reasoning
PRIVATE (local / isolated)  the deliberately vulnerable target
```

Vulnerable targets run on localhost or in an isolated VM or container, are
never exposed to the internet, and are never deployed as part of this site. A
portfolio that hosts live vulnerable endpoints is not demonstrating security
skill; it is demonstrating the absence of it. If a future lab needs a runnable
demonstration, keep it in a separate repository with its own isolation notes
and link to it — do not mount it here.

---

## Testing

```bash
npm test
```

116 tests across five files, run against a **real PostgreSQL database** rather
than mocks — the analytics layer's correctness lives almost entirely in its
SQL, and a mocked driver would verify that strings were assembled, not that the
queries are right.

| File | Covers |
|---|---|
| `validation.test.js` | Path normalisation, event schemas, UA classification, referrer attribution |
| `tracking.test.js` | Cookie flags, the full ingest chain, session windowing, sequence numbers, bot exclusion, hostile payloads |
| `auth.test.js` | bcrypt storage, enumeration (including **timing**), lockout, rate limiting, session fixation, CSRF, endpoint authorisation, error-leak checks |
| `analytics.test.js` | Every aggregate, with seeded data and exact expected figures |
| `insights.test.js` | The aggregate-only boundary, the anti-fabrication verifier, and AI-absent / AI-broken fallbacks |

The suite truncates tables, so it refuses to run against a database whose name
does not contain `test`. Create one with:

```bash
createdb portfolio_analytics_test
DB_NAME=portfolio_analytics_test npm run db:migrate
```

---

## Deployment

**Deploy single-origin.** Express serves the built SPA, so the visitor cookie
stays first-party, CORS is not part of the design, and the tracking beacon
cannot be blocked as third-party.

```bash
npm ci
npm --prefix client ci
npm run build
npm run db:migrate
npm start
```

### A caveat about Vercel

Vercel is an excellent host for the *frontend* and a poor one for this
*backend*. Serverless functions cannot hold a persistent `pg` pool or
PostgreSQL-backed sessions well, and splitting the frontend and API across two
different domains turns `portfolio_visitor` into a **third-party cookie**, which
browsers now block — the analytics would silently die in production.

Recommended: one Node service on **Render**, **Railway** or **Fly.io**, with
managed PostgreSQL from **Neon** or **Supabase**.

If you want Vercel specifically, the workable shape is a custom domain with the
frontend on `sahilzagade.com` and the API on `api.sahilzagade.com` — same
registrable domain, so the cookie stays same-site. Set `CORS_ORIGINS` to the
frontend origin and `TRUST_PROXY=1`. Full instructions for both paths are in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Production checklist

- [ ] `NODE_ENV=production`
- [ ] `SESSION_SECRET` set to 48 random bytes (the app refuses to boot otherwise)
- [ ] `SITE_URL` set to the real origin
- [ ] `TRUST_PROXY=1` behind exactly one proxy
- [ ] `DB_SSL=true` for managed PostgreSQL
- [ ] `npm run db:migrate` run against production
- [ ] `npm run admin:create` run on the production server
- [ ] HTTPS enforced (HSTS turns on automatically)
- [ ] `npm run db:prune` scheduled (daily is plenty)

---

## Filling in your content

All editable content is in `client/src/content/`. Nothing about your history,
employers, dates, grades, certifications or metrics has been invented —
unknown values are explicit placeholders that render as **visible dashed
markers** on the page, so they cannot ship by accident.

```bash
grep -rn "TODO(" client/src/content/
```

| File | Contains |
|---|---|
| `site.js` | Name, positioning, GitHub/LinkedIn/email/résumé links, SEO defaults |
| `profile.js` | Bio, experience, skills, certifications, education |
| `projects.js` | Case studies. ThreatScope's structure is built out and awaiting your content. |
| `labs.js` | Lab write-ups. Three are complete and describe this application's own controls. |

`evidencedSkills` in `profile.js` is the exception: those entries are
verifiable against this repository and are presented separately from
self-reported experience, which is both more honest and, to a technical reader,
more persuasive.

Adding a route? Add it to `src/content/routes.js` too, or it will not appear in
the sitemap.

---

## Licence

All rights reserved. The content is personal; the code is published as a work
sample.
