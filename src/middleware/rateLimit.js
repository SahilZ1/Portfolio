/**
 * Rate limiters.
 *
 * Three tiers, because the endpoints have genuinely different risk profiles:
 *
 *  - login     strict. Brute force and credential stuffing are the realistic
 *              attacks against a single-administrator site. Successful logins
 *              are not counted, so a legitimate admin is never locked out by
 *              their own activity.
 *  - tracking  generous but finite. A real visitor generates a handful of
 *              requests per minute; this exists to stop someone scripting
 *              millions of fake page views and poisoning the analytics.
 *  - api       a broad backstop for everything else.
 *
 * All limiters key on the client IP. `app.set('trust proxy', <number>)` in
 * app.js is what makes that IP trustworthy behind a reverse proxy -- using
 * `true` there would let any client spoof X-Forwarded-For and bypass all of
 * this, which is why config exposes a hop count instead of a boolean.
 */

const rateLimit = require("express-rate-limit");
const { MemoryStore } = require("express-rate-limit");
const { config } = require("../config");
const logger = require("../utils/logger");

function onLimitReached(name) {
  return (req, res, next, options) => {
    logger.warn("Rate limit exceeded", { limiter: name, path: req.path, method: req.method });
    res.status(options.statusCode).json({
      error: { code: "rate_limited", message: "Too many requests. Please slow down." },
    });
  };
}

/**
 * Stores are constructed explicitly rather than left to the default so the
 * test suite can reset them between cases. A suite that deliberately triggers
 * lockout would otherwise exhaust the per-IP budget for every test that runs
 * after it, and the limiter would be silently untestable.
 */
const loginStore = new MemoryStore();
const trackingStore = new MemoryStore();
const apiStore = new MemoryStore();

const loginLimiter = rateLimit({
  store: loginStore,
  windowMs: config.security.loginWindowMs,
  limit: config.security.loginMaxAttempts,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: onLimitReached("login"),
});

const trackingLimiter = rateLimit({
  store: trackingStore,
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: onLimitReached("tracking"),
});

const apiLimiter = rateLimit({
  store: apiStore,
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Health checks are polled by the platform's load balancer and must never be
  // throttled, or a burst of traffic would look like an outage.
  skip: (req) => req.path === "/api/health",
  handler: onLimitReached("api"),
});

/**
 * Clear all rate-limit counters. Test-only: never called from application code,
 * because an endpoint that resets its own limiter would defeat the limiter.
 */
function resetLimitersForTests() {
  loginStore.resetAll();
  trackingStore.resetAll();
  apiStore.resetAll();
}

module.exports = { loginLimiter, trackingLimiter, apiLimiter, resetLimitersForTests };
