# Architecture

Detailed design notes. The README has the overview; this document covers the
data flows, the module boundaries, and the reasoning behind the shape of each.

---

## 1. Request lifecycle

Middleware order in `src/app.js` is load-bearing:

```
1.  trust proxy (hop count)      must precede anything IP-dependent, or the
                                 rate limiters key on the proxy's address
2.  helmet                       security headers, including CSP
3.  compression
4.  cors                         only when CORS_ORIGINS is set
5.  cookie-parser
6.  visitorTracker               reads/issues the anonymous cookie. NO I/O.
7.  express-session              admin sessions, PostgreSQL-backed
8.  apiLimiter                   broad backstop on /api
9.  routes
10. /api 404 handler             JSON, so a fetch() caller never gets HTML
11. SPA static + fallback
12. errorHandler                 LAST — Express only routes errors to handlers
                                 declared after the routes that raise them
```

Two things are worth drawing out:

**`visitorTracker` does no database work.** It sits in front of the entire
application, including every static asset, so it must be cheap. It reads a
cookie, validates its shape, and either passes it through or issues a new one.
Nothing else.

**`express-session` runs after `visitorTracker`,** and with
`saveUninitialized: false`, so no session row is created for anonymous
visitors. The `session` table holds admin sessions only.

---

## 2. The analytics data model

```
visitors  ─1──*─►  sessions  ─1──*─►  page_views
                        └────1──*─►  events
```

| Level | Lifetime | Identity |
|---|---|---|
| Visitor | 365 days (cookie) | Random v4 UUID, derived from nothing |
| Session | 30 min inactivity | Server-assigned UUID, never sent to the client |
| Page view | Instant | — |
| Event | Instant | — |

### Why sessions are reconstructed server-side

The client could hold a session id and send it with each request. It does not,
for two reasons:

1. A client-held session id is client-controlled. Anyone could post arbitrary
   ids and merge their activity into someone else's visit, or fabricate
   journeys.
2. Session boundaries are a server-side analytical decision — a 30-minute
   inactivity window — not a fact about the browser. Keeping the rule in one
   place means changing it changes every future session consistently.

The cost is a lookup per page view (`idx_sessions_visitor_activity` covers it).

### Why counters are denormalised

`sessions.page_view_count` and `sessions.event_count` duplicate information
derivable by counting child rows. They are maintained on write because nearly
every dashboard aggregate needs them: bounce rate is
`COUNT(*) FILTER (WHERE page_view_count <= 1)`, and pages-per-session is a
plain `SUM`. Without them, each of those becomes a correlated subquery over
`page_views`. The write cost is one integer increment inside a transaction
that is already open.

### Why `view_sequence` exists

Journey reconstruction is a self-join on consecutive sequence values:

```sql
FROM page_views a
JOIN page_views b
  ON b.session_id = a.session_id
 AND b.view_sequence = a.view_sequence + 1
```

Deriving the same thing from timestamps needs a window function and an ordering
assumption, and produces wrong results when two views land in the same
millisecond. The sequence number also makes the entry view trivially
identifiable (`view_sequence = 1`).

### Why `duration_seconds` is NULL on the last view

A page view's duration is only known once the *next* one arrives. The final
view of a visit therefore has no duration — and that absence is precisely the
exit-page signal, so it carries information rather than being a gap.

Durations are capped at one hour: a tab left open overnight should not
contribute an eight-hour "time on page".

---

## 3. Ingest flow

```
POST /api/track/pageview
  │
  ├─ trackingLimiter          120/min per IP
  ├─ express.json({ 4kb })    a tracking payload is a few hundred bytes
  ├─ pageViewSchema.safeParse
  │     ├─ path: must start with "/", not "//", no control chars,
  │     │        query string and fragment stripped, ≤512 chars,
  │     │        trailing slash collapsed
  │     └─ title: control chars removed, whitespace collapsed, ≤200
  │
  └─ recordPageView({ visitorUuid: req.visitorUuid, ... })
        │                      ↑ from the HttpOnly cookie, NEVER the body
        │
        └─ BEGIN
             1. upsert visitor        ON CONFLICT ... RETURNING id, (xmax = 0)
             2. resolve session       live one, or close stale + open new
             3. close previous view   duration_seconds = LEAST(3600, …)
             4. insert page view      view_sequence = MAX + 1
             5. update session        exit_page, entry_page ??=, counters
           COMMIT
```

The visitor identity comes from the cookie, not the request body. That is what
stops a client writing into another visitor's history by naming them.

The upsert is a single round trip. Two statements would race between concurrent
requests from the same browser — two tabs restored at once is enough.

### Events never create sessions

If an event arrives with no live session — a race, or a replayed request — it is
dropped rather than causing a session with no entry page to be invented. The
response is still `204`: analytics failures must never surface in a visitor's
browser.

---

## 4. Aggregation layer

Every function in `analyticsService.js` follows four rules:

1. **Bots excluded.** Every query filters `is_bot = FALSE`.
2. **Windows bounded.** `days` is validated to 1–365 before it arrives, so no
   single dashboard request can scan unbounded history.
3. **Parameterised.** Windows use `make_interval(days => $1::INT)`. No request
   value is ever concatenated into SQL.
4. **Gaps filled.** Time series use `generate_series`, so a day with no traffic
   is a zero rather than a missing point a chart would interpolate through.

`getOverview()` computes the current window and the immediately preceding
window of the same length in one query, using `FILTER` clauses over a single
scan, so every tile can show a real period-over-period change without a second
round trip.

---

## 5. Authentication flow

```
┌─────────┐                    ┌──────────┐              ┌────────────┐
│ Browser │                    │ Express  │              │ PostgreSQL │
└────┬────┘                    └─────┬────┘              └──────┬─────┘
     │                               │                          │
     │  GET /admin  (static SPA)     │                          │
     ├──────────────────────────────►│                          │
     │                               │                          │
     │  GET /api/admin/auth/session  │                          │
     ├──────────────────────────────►│                          │
     │  { authenticated: false,      │                          │
     │    setupRequired: bool }      │                          │
     │◄──────────────────────────────┤                          │
     │                               │                          │
     │  POST .../login  {u, p}       │                          │
     ├──────────────────────────────►│                          │
     │                               │  SELECT admin_users      │
     │                               ├─────────────────────────►│
     │                               │                          │
     │                               │  bcrypt.compare          │
     │                               │  (real hash, or a DUMMY  │
     │                               │   hash if no such user — │
     │                               │   equal work either way) │
     │                               │                          │
     │                               │  INSERT login attempt    │
     │                               ├─────────────────────────►│
     │                               │                          │
     │                               │  session.regenerate()    │
     │                               │  ← NEW id at the moment  │
     │                               │    privileges change     │
     │                               │  INSERT session row      │
     │                               ├─────────────────────────►│
     │                               │                          │
     │  Set-Cookie: portfolio_admin_sid                         │
     │    HttpOnly; Secure; SameSite=Strict                     │
     │  { user, csrfToken }          │                          │
     │◄──────────────────────────────┤                          │
     │                               │                          │
     │  GET /api/admin/analytics/*   │                          │
     │  (cookie sent automatically)  │                          │
     ├──────────────────────────────►│                          │
     │                               │  requireAdmin — router   │
     │                               │  level, not per handler  │
     │                               │                          │
     │  POST .../logout              │                          │
     │  X-CSRF-Token: …              │                          │
     ├──────────────────────────────►│                          │
     │                               │  session.destroy()       │
     │                               │  DELETE session row      │
     │                               ├─────────────────────────►│
```

### Why `requireAdmin` is mounted on the router

```js
router.use(requireAdmin);          // once, for every route below
```

not

```js
router.get("/overview", requireAdmin, handler);   // per route
```

A per-route guard is one forgotten line away from an unauthenticated data leak.
There is a test that enumerates every analytics endpoint and asserts each
returns 401 without a session — but the router-level mount is what makes a new
endpoint protected by default rather than by memory.

### CSRF, in two layers

1. `SameSite=Strict` on the session cookie. No cross-site request carries it at
   all, in any browser that honours the attribute.
2. A double-submit token: random per session, handed over an authenticated GET,
   required in `X-CSRF-Token` on every unsafe method. An attacker's page can
   cause a cross-site request but cannot read the token, because same-origin
   policy stops it reading our responses.

Either layer alone would probably do. Both is cheap.

---

## 6. AI boundary

```
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL — full detail, never leaves the server           │
│  visitor UUIDs · session UUIDs · referrer URLs · timestamps  │
└───────────────────────────┬──────────────────────────────────┘
                            │  analyticsService aggregation
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Snapshot — THE BOUNDARY (insightsService.buildSnapshot)     │
│  counts · rates · labels · internal page paths               │
│  inspectable at /api/admin/analytics/insights/snapshot       │
└──────────────┬────────────────────────────┬──────────────────┘
               │                            │
     deterministic rules            AI provider (optional)
               │                            │
               │                     output verification
               │                     every number must appear
               │                     in the snapshot, or the
               │                     insight is discarded
               │                            │
               └────────────┬───────────────┘
                            ▼
                    Console insights
```

The verifier collects every number present in the snapshot, plus percentages
derivable from any two of them, then scans each generated sentence. Figures ≤3
and four-digit years are allowed through, because they appear in ordinary prose
("the top 3 pages", "in 2026") without being claims about the data. Anything
else that is not in the source data causes the insight to be dropped and logged.

If every insight is rejected, the console shows the deterministic rules instead
and says so.

---

## 7. Frontend structure

```
main.jsx
  └─ BrowserRouter
       └─ App.jsx           route table, lazy chunks
            ├─ /admin/*  →  AdminApp        (separate chunk; a normal
            │                                visitor never downloads it)
            └─ Layout                       nav, page transition, footer,
                 └─ <Outlet/>               analytics notice
```

`Layout` owns the two cross-cutting behaviours that belong in exactly one
place: scroll restoration, and page-view reporting.

Page-view reporting defers by one animation frame. React 19 hoists a route's
`<title>` during commit, so reading `document.title` synchronously in the
effect captures the *previous* page's title. One frame later it is correct.

### Motion

One easing curve (`cubic-bezier(0.22, 1, 0.36, 1)`) and one set of durations
across the whole site. Consistency of timing is most of what makes interface
motion feel designed rather than assembled.

Only `opacity` and `transform` are animated — both compositor-handled, so they
do not trigger layout or paint. `prefers-reduced-motion` is handled at the
source in `lib/motion.js`: `fadeUp()` returns opacity-only variants when the
preference is set, so components do not each branch, and the result is a still
page rather than a fast-but-still-moving one.

Scroll reveals use `viewport={{ once: true }}`. Without it an element replays
its entrance every time it re-enters view, which makes small scroll adjustments
flicker — the single most common flaw in scroll-animated sites.

### The hero canvas

One `<canvas>`, not sixty animated DOM nodes. It stops rendering when scrolled
out of view (`IntersectionObserver`) and when the tab is hidden
(`visibilitychange`); node count scales with viewport area and is capped hard on
small screens; `devicePixelRatio` is capped at 2; link-finding compares squared
distances to avoid a `sqrt` per pair. Under reduced motion it renders one static
frame and never starts the loop. Pointer parallax is not registered at all on a
coarse pointer.

### The traffic-flow diagram

Three columns of nodes with cubic-Bézier ribbons whose thickness is
proportional to session volume. Packets travel the ribbons' centre lines using
CSS `offset-path`, animated by the browser with no JavaScript loop.

The animation carries information rather than decorating: the single most
important thing the diagram communicates is *direction*, and a static Sankey
leaves the reader to infer it from left-to-right convention. Under reduced
motion the packets are replaced by arrowheads, so direction is still conveyed.

---

## 8. Module boundaries

| Module | May depend on | Must not |
|---|---|---|
| `config` | nothing | — |
| `utils/*` | `config` | services, routes |
| `db/database` | `config`, `utils` | services, routes |
| `services/*` | `db`, `config`, `utils`, other services | routes, Express types |
| `middleware/*` | `config`, `utils`, `services` | routes |
| `routes/*` | everything above | other routes |
| `app.js` | everything | — |

Services take and return plain objects. They never touch `req` or `res`, which
is what lets the analytics functions be tested directly against seeded data
without HTTP.

`process.env` is read in exactly one file. Everything else imports `config`.
