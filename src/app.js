/**
 * Express application factory.
 *
 * Separated from server.js so the app can be constructed and exercised by the
 * test suite with supertest, without binding a port or starting timers.
 *
 * Middleware order is load-bearing and runs as follows:
 *
 *   trust proxy -> security headers -> compression -> CORS -> cookies
 *   -> visitor cookie -> sessions -> rate limit -> routes -> SPA -> errors
 *
 * Notably, the visitor-cookie middleware runs before the session middleware and
 * does no I/O, so it costs nothing on asset requests; and the error handler is
 * registered last, because Express only routes errors to handlers declared
 * after the routes that raise them.
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");

const { config } = require("./config");
const { pool } = require("./db/database");
const logger = require("./utils/logger");
const visitorTracker = require("./middleware/visitorTracker");
const { apiLimiter } = require("./middleware/rateLimit");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const healthRoutes = require("./routes/health");
const trackRoutes = require("./routes/track");
const authRoutes = require("./routes/auth");
const analyticsRoutes = require("./routes/analytics");
const seoRoutes = require("./routes/seo");

const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

/**
 * Content Security Policy.
 *
 * Tight by design, and tuned to what the built SPA actually needs rather than
 * relaxed until things stopped breaking:
 *
 *  - `default-src 'self'` -- everything is same-origin, which is the whole
 *    point of deploying the API and the SPA behind one host.
 *  - `script-src 'self'` with NO 'unsafe-inline' and NO 'unsafe-eval'. This is
 *    the control that actually blunts XSS, and a Vite production build emits
 *    external script files only, so nothing needs the exemption.
 *  - `style-src` allows 'unsafe-inline' because React sets inline styles for
 *    animated transforms. Inline styles cannot execute code, so this weakens
 *    the policy far less than an inline-script allowance would.
 *  - `connect-src 'self'` -- the tracking beacon only ever posts to its own
 *    origin, so any exfiltration attempt to a third party is blocked.
 *  - `frame-ancestors 'none'` -- clickjacking protection, and the modern
 *    replacement for X-Frame-Options.
 *  - `object-src 'none'`, `base-uri 'self'` -- kill plugin embedding and
 *    base-tag injection, both classic XSS amplifiers.
 */
function contentSecurityPolicy() {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
  };

  if (config.isProduction) {
    directives.upgradeInsecureRequests = [];
  } else {
    // Vite's dev server uses a websocket for hot reload and injects its client
    // over HTTP. Relaxed in development only; production keeps the strict set.
    directives.connectSrc = ["'self'", "ws:", "http://localhost:*"];
    directives.scriptSrc = ["'self'", "'unsafe-inline'"];
  }

  return { useDefaults: false, directives };
}

function createApp() {
  const app = express();

  // Must be set before any IP-dependent middleware. A hop count rather than
  // `true`: trusting every proxy header would let a client spoof its address
  // and walk straight through the rate limiters.
  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: contentSecurityPolicy(),
      // Send the origin but not the path to other sites, and nothing at all when
      // downgrading to HTTP. Keeps our internal paths out of other people's logs.
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      // Enabled only in production over real HTTPS. Sending HSTS from a
      // localhost HTTP server would pin the browser and break development.
      hsts: config.security.enableHsts
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
        : false,
      crossOriginEmbedderPolicy: false, // Would block legitimate image embedding.
      crossOriginResourcePolicy: { policy: "same-origin" },
      xFrameOptions: { action: "deny" },
      noSniff: true,
    })
  );

  app.use(compression());

  /**
   * CORS is disabled by default and stays that way for the recommended
   * single-origin deployment, where the SPA and API share a host and no
   * cross-origin request ever occurs.
   *
   * It exists for the split deployment (portfolio on one host, API on another).
   * The allowlist is explicit -- a wildcard origin is incompatible with
   * `credentials: true` anyway, and would defeat the SameSite protections.
   */
  if (config.security.corsOrigins.length > 0) {
    app.use(
      cors({
        origin(origin, callback) {
          // Same-origin and server-to-server requests send no Origin header.
          if (!origin) return callback(null, true);
          if (config.security.corsOrigins.includes(origin)) return callback(null, true);
          return callback(new Error("Origin not allowed"));
        },
        credentials: true,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "X-CSRF-Token"],
        maxAge: 86_400,
      })
    );
    logger.info("CORS enabled for configured origins", { count: config.security.corsOrigins.length });
  }

  app.use(cookieParser());

  // Issues/reads the anonymous visitor cookie. No database access.
  app.use(visitorTracker);

  /**
   * Administrator sessions, stored in PostgreSQL.
   *
   *  - `store`          server-side state; a restart does not sign the admin
   *                     out, and a session can be revoked by deleting its row.
   *  - `httpOnly`       the session id is unreachable from JavaScript, so an
   *                     XSS payload cannot steal it.
   *  - `sameSite:strict` no cross-site request carries this cookie at all,
   *                     which is the first and strongest CSRF control. Strict
   *                     is acceptable here precisely because /admin is never
   *                     linked to from anywhere else.
   *  - `secure`         production only; the id never crosses plain HTTP.
   *  - `resave:false`   avoids rewriting an unchanged session on every request.
   *  - `saveUninitialized:false` no session row is created for anonymous
   *                     visitors, so the table holds admin sessions only.
   *  - `rolling:true`   activity extends the window; an idle console still
   *                     expires on schedule.
   *  - `name`           not the default `connect.sid`, which advertises the
   *                     framework to anyone reading response headers.
   */
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      name: config.session.name,
      secret: config.session.secret,
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: false, // Migration 004 owns the schema.
        pruneSessionInterval: 60 * 15,
      }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: config.isProduction,
      cookie: {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "strict",
        maxAge: config.session.ttlMs,
        path: "/",
      },
    })
  );

  app.use("/api", apiLimiter);

  app.use("/api", healthRoutes);
  app.use("/api/track", trackRoutes);
  app.use("/api/admin/auth", authRoutes);
  app.use("/api/admin/analytics", analyticsRoutes);
  app.use("/", seoRoutes);

  // Unknown /api paths get a JSON 404 rather than falling through to the SPA,
  // which would return HTML to a fetch() caller and produce a confusing error.
  app.use("/api", notFoundHandler);

  mountClient(app);

  app.use(errorHandler);

  return app;
}

/**
 * Serve the built SPA in production.
 *
 * In development the SPA is served by Vite on its own port and proxies /api
 * here, so there is nothing to mount and a clear message beats a silent 404.
 */
function mountClient(app) {
  const indexFile = path.join(CLIENT_DIST, "index.html");

  if (!fs.existsSync(indexFile)) {
    app.get(/^(?!\/api).*/, (req, res) => {
      res
        .status(503)
        .type("text/plain")
        .send(
          "Portfolio client has not been built.\n\n" +
            "Development:  npm run dev   (Vite serves the site on http://localhost:5173)\n" +
            "Production:   npm run build && npm start\n"
        );
    });
    return;
  }

  // Fingerprinted assets are immutable and can be cached hard; index.html must
  // never be, or a deploy would not reach browsers holding a cached shell.
  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      etag: true,
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  // SPA fallback: any non-API path renders the shell and lets the router decide.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexFile);
  });
}

module.exports = { createApp, CLIENT_DIST };
