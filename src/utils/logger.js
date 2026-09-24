/**
 * Minimal structured logger.
 *
 * Deliberately dependency-free. The important property is not the formatting —
 * it is `redact()`, which strips credentials and pseudonymous identifiers before
 * anything reaches stdout. Logs are a real data-exposure surface: the original
 * visitorTracker logged full visitor UUIDs on every request, which puts a
 * long-lived tracking identifier into plaintext infrastructure logs.
 */

const { config } = require("../config");

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

/** Keys whose values must never be written to a log, at any depth. */
const SECRET_KEYS = new Set([
  "password", "pass", "secret", "token", "apikey", "api_key", "authorization",
  "cookie", "set-cookie", "sessionsecret", "session_secret", "dbpassword",
  "db_password", "connectionstring", "database_url", "csrftoken", "csrf_token",
]);

/** Keys holding pseudonymous IDs: keep a short prefix for correlation only. */
const PSEUDONYM_KEYS = new Set(["visitoruuid", "visitor_uuid", "sessionuuid", "session_uuid"]);

function redact(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (typeof value !== "object") return value;

  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const normalised = key.toLowerCase().replace(/[-_]/g, "");
    if (SECRET_KEYS.has(normalised) || SECRET_KEYS.has(key.toLowerCase())) {
      out[key] = "[redacted]";
    } else if (PSEUDONYM_KEYS.has(key.toLowerCase())) {
      out[key] = typeof raw === "string" ? `${raw.slice(0, 8)}…` : "[id]";
    } else {
      out[key] = redact(raw, depth + 1);
    }
  }
  return out;
}

function emit(level, message, meta) {
  if (LEVELS[level] > threshold) return;
  const record = { ts: new Date().toISOString(), level, msg: message };
  if (meta !== undefined) record.meta = redact(meta);

  const line = config.isProduction ? JSON.stringify(record) : formatHuman(record);
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

function formatHuman({ ts, level, msg, meta }) {
  const time = ts.slice(11, 19);
  const tag = level.toUpperCase().padEnd(5);
  const tail = meta ? ` ${JSON.stringify(meta)}` : "";
  return `${time} ${tag} ${msg}${tail}`;
}

module.exports = {
  error: (msg, meta) => emit("error", msg, meta),
  warn: (msg, meta) => emit("warn", msg, meta),
  info: (msg, meta) => emit("info", msg, meta),
  debug: (msg, meta) => emit("debug", msg, meta),
  redact,
};
