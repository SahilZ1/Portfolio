/**
 * Central configuration.
 *
 * Every environment-dependent value in the application is resolved here exactly
 * once, validated at boot, and exported as a frozen object. Nothing else in the
 * codebase reads `process.env` directly.
 *
 * Failing fast at startup is deliberate: a missing DB password should crash the
 * process on line one, not surface as a confusing query error under load.
 */

// Load .env before anything reads process.env. Doing it here rather than in
// each entry point means every consumer of config -- the server, the migration
// runner, the admin CLI, the test suite -- gets a populated environment from a
// single import, with no ordering hazard.
require("dotenv").config({ quiet: true });

const REQUIRED_IN_PRODUCTION = ["SESSION_SECRET", "DB_PASSWORD"];

function bool(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const env = process.env.NODE_ENV || "development";
const isProduction = env === "production";
const isTest = env === "test";

const config = Object.freeze({
  env,
  isProduction,
  isTest,
  port: int(process.env.PORT, 3000),

  /**
   * Public origin of the deployed site. Used for canonical URLs, the sitemap,
   * and for deciding whether a referrer is internal.
   */
  siteUrl: (process.env.SITE_URL || `http://localhost:${int(process.env.PORT, 3000)}`).replace(/\/$/, ""),

  /**
   * Trust proxy hop count. Behind exactly one reverse proxy (Render, Railway,
   * Fly, nginx) this should be 1. Setting it to `true` would let a client spoof
   * `X-Forwarded-For` and defeat IP-based rate limiting, so we use a number.
   */
  trustProxy: int(process.env.TRUST_PROXY, isProduction ? 1 : 0),

  db: Object.freeze({
    // A full connection string wins when present: managed Postgres providers
    // (Neon, Supabase, Render) hand out a DATABASE_URL rather than parts.
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || "localhost",
    port: int(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || "portfolio_analytics",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: bool(process.env.DB_SSL, false),
    maxConnections: int(process.env.DB_POOL_MAX, 10),
    idleTimeoutMs: int(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMs: int(process.env.DB_CONNECTION_TIMEOUT_MS, 10_000),
  }),

  session: Object.freeze({
    name: process.env.SESSION_COOKIE_NAME || "portfolio_admin_sid",
    // Dev fallback keeps `npm run dev` working on a fresh clone; production
    // boot refuses to start without a real secret (see assertProductionSecrets).
    secret: process.env.SESSION_SECRET || "dev-only-insecure-session-secret",
    ttlMs: int(process.env.SESSION_TTL_MS, 1000 * 60 * 60 * 8),
  }),

  analytics: Object.freeze({
    visitorCookieName: process.env.VISITOR_COOKIE_NAME || "portfolio_visitor",
    visitorCookieMaxAgeMs: int(process.env.VISITOR_COOKIE_MAX_AGE_MS, 1000 * 60 * 60 * 24 * 365),
    // A session ends after this much inactivity. 30 minutes is the long-standing
    // web-analytics convention, which keeps our numbers comparable to other tools.
    sessionTimeoutMs: int(process.env.ANALYTICS_SESSION_TIMEOUT_MS, 1000 * 60 * 30),
    // Retention target documented on /privacy and enforced by `npm run db:prune`.
    retentionDays: int(process.env.ANALYTICS_RETENTION_DAYS, 400),
  }),

  security: Object.freeze({
    corsOrigins: list(process.env.CORS_ORIGINS),
    // Number of failed logins from one IP before lockout, and the window length.
    loginMaxAttempts: int(process.env.LOGIN_MAX_ATTEMPTS, 8),
    loginWindowMs: int(process.env.LOGIN_WINDOW_MS, 1000 * 60 * 15),
    bcryptRounds: int(process.env.BCRYPT_ROUNDS, 12),
    enableHsts: bool(process.env.ENABLE_HSTS, isProduction),
  }),

  ai: Object.freeze({
    provider: process.env.AI_PROVIDER || "none",
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "claude-sonnet-5",
    // Insights are cached so opening the dashboard repeatedly does not bill a
    // model call each time.
    cacheTtlMs: int(process.env.AI_CACHE_TTL_MS, 1000 * 60 * 30),
    timeoutMs: int(process.env.AI_TIMEOUT_MS, 20_000),
  }),

  logLevel: process.env.LOG_LEVEL || (isTest ? "silent" : isProduction ? "info" : "debug"),
});

/**
 * Refuse to boot a production process with development placeholder secrets.
 * Called from server.js rather than at import time so that tests and tooling
 * can import config freely.
 */
function assertProductionSecrets() {
  if (!config.isProduction) return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Refusing to start in production: missing required environment variables: ${missing.join(", ")}`
    );
  }
  if (config.session.secret.startsWith("dev-only")) {
    throw new Error("Refusing to start in production with the development SESSION_SECRET.");
  }
  if (config.session.secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }
}

module.exports = { config, assertProductionSecrets };
