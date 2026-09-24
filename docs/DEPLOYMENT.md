# Deployment

Two viable architectures. The first is recommended; the second exists because
you asked about Vercel and it can be made to work.

---

## Why the architecture choice matters here

This application has two properties that constrain hosting:

1. **A persistent PostgreSQL connection pool** and PostgreSQL-backed sessions.
   Serverless functions spin up and tear down per request; a pool either cannot
   be reused or exhausts `max_connections` under concurrency.

2. **A first-party cookie that must stay first-party.** If the SPA is served
   from `portfolio.vercel.app` and the API from `api.onrender.com`, then
   `portfolio_visitor` is a **third-party cookie** — and browsers now block
   those by default. The analytics would return 204s and record nothing. It
   would fail silently, which is the worst way for it to fail.

Both point the same way: put the SPA and the API on one origin.

---

## Option A — Single origin (recommended)

```
┌──────────────────────────────────────────┐
│  Render / Railway / Fly.io               │
│  ┌────────────────────────────────────┐  │
│  │  Node process                      │  │
│  │   Express  ──serves──►  SPA build  │  │
│  │      │                             │  │
│  │      └──► /api/*                   │  │
│  └──────────────┬─────────────────────┘  │
└─────────────────┼────────────────────────┘
                  │ TLS
      ┌───────────▼────────────┐
      │  Neon / Supabase /     │
      │  provider's managed PG │
      └────────────────────────┘
```

One deployable. Cookies are first-party. CORS is not part of the design. The
tracking beacon cannot be blocked as third-party.

### Render

**Database** — create a PostgreSQL instance and copy its *internal* connection
string.

**Web service** — connect the repo, then:

| Setting | Value |
|---|---|
| Build command | `npm ci && npm --prefix client ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

**Environment:**

```
NODE_ENV=production
SITE_URL=https://your-service.onrender.com
TRUST_PROXY=1
DATABASE_URL=<internal connection string>
DB_SSL=true
SESSION_SECRET=<48 random bytes>
LOG_LEVEL=info
```

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**After the first deploy**, from the service shell:

```bash
npm run db:migrate
npm run admin:create
```

`db:migrate` is deliberately not in the start command. A migration that runs on
every boot will eventually run concurrently on two instances during a rolling
deploy.

**Schedule retention** — a Render Cron Job, daily:

```bash
npm run db:prune
```

### Railway

Same shape. Add a PostgreSQL plugin; Railway injects `DATABASE_URL`
automatically. Set the remaining variables as above, build with
`npm ci && npm --prefix client ci && npm run build`, start with `npm start`.

### Fly.io

`fly launch`, then `fly postgres create` and `fly postgres attach`. Set secrets
with `fly secrets set SESSION_SECRET=… SITE_URL=… TRUST_PROXY=1 DB_SSL=true`.
Run migrations via `fly ssh console -C "npm run db:migrate"`.

### Self-hosted (VPS + nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name sahilzagade.com;

    ssl_certificate     /etc/letsencrypt/live/sahilzagade.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sahilzagade.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        # Exactly one proxy hop, which is why TRUST_PROXY=1 is correct and
        # `true` would let a client spoof this header.
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name sahilzagade.com;
    return 301 https://$host$request_uri;
}
```

Run the app under systemd or PM2. `TRUST_PROXY=1`.

---

## Option B — Vercel frontend + separate API

Workable **only with a custom domain**. Without one, the third-party cookie
problem above applies and the analytics will not work.

```
sahilzagade.com          →  Vercel (static SPA)
api.sahilzagade.com      →  Render / Railway / Fly (Express)
```

Both are subdomains of the same registrable domain, so the cookie is same-site
and `SameSite=Lax` still permits it. Set the cookie `Domain` if you need it
shared across subdomains — for this setup the API host setting it on its own
subdomain is sufficient, because the browser sends it back on the XHR.

### Vercel

| Setting | Value |
|---|---|
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |

Add `client/vercel.json` for SPA routing and to point `/api` at the backend:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.sahilzagade.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

A rewrite (proxy) is better than pointing `fetch` at the API host directly: the
browser still sees one origin, which keeps the cookie first-party *and* keeps
`connect-src 'self'` in the CSP intact.

### API host

Deploy as in Option A, plus:

```
CORS_ORIGINS=https://sahilzagade.com
SITE_URL=https://sahilzagade.com
```

CORS is only needed if you skip the rewrite and call the API host directly.
With the rewrite in place, leave `CORS_ORIGINS` empty.

### What Vercel cannot host

Do not try to run `src/server.js` as a Vercel serverless function. The pool,
the PostgreSQL session store, and the maintenance timer all assume a
long-lived process.

---

## Production checklist

Before announcing the link:

**Configuration**
- [ ] `NODE_ENV=production`
- [ ] `SESSION_SECRET` = 48 random bytes (boot fails otherwise — verify it does)
- [ ] `SITE_URL` = the real origin, no trailing slash
- [ ] `TRUST_PROXY=1` behind exactly one proxy
- [ ] `DB_SSL=true` for managed PostgreSQL
- [ ] `LOG_LEVEL=info`

**Database**
- [ ] `npm run db:migrate` run against production
- [ ] `npm run db:migrate:status` shows everything applied, nothing drifted
- [ ] `npm run admin:create` run on the production host
- [ ] Automated backups enabled
- [ ] `npm run db:prune` scheduled daily

**Verify after deploy**
- [ ] `curl -s https://your-domain/api/health` → `"database": "connected"`
- [ ] `curl -I https://your-domain` shows HSTS, CSP with `script-src 'self'`
      (and no `'unsafe-inline'`), `X-Frame-Options: DENY`
- [ ] Visitor cookie is `HttpOnly; Secure; SameSite=Lax`
- [ ] `/admin` login works; a wrong password returns the same message as an
      unknown username
- [ ] `/robots.txt` and `/sitemap.xml` show the correct domain
- [ ] Browse a few pages, then confirm they appear in the console
- [ ] `/privacy` opt-out button clears the cookie

**Content**
- [ ] `grep -rn "TODO(" client/src/content/` returns nothing you would not
      want a recruiter to read
- [ ] `git log -p -- .env` is empty, and `git check-ignore -v .env` confirms it
      is ignored

---

## Operating it

**Monitoring.** `/api/health` returns 503 (not 500) when the database is
unreachable — the process is alive but not ready, which is what a load balancer
needs to stop sending traffic without killing the container. Point the
platform's health check at it.

**Logs.** JSON lines in production. Secrets are redacted by key and visitor
identifiers truncated, so logs can be shipped to a third-party aggregator
without leaking either.

**Backups.** The analytics data is not critical, but `admin_users` is. Use the
provider's automated backups.

**Zero-downtime deploys.** The app handles `SIGTERM`: it stops the maintenance
timer, closes the listener, drains in-flight requests, and ends the pool, with
a 10-second forced exit as a backstop. Sessions survive a restart because they
live in PostgreSQL.

**Scaling.** One instance is ample. Before adding a second, note that the rate
limiters are per-process and in-memory — each instance would hold its own
counters, multiplying the effective limit. Move them to a shared store first.
