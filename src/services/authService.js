/**
 * Administrator authentication.
 *
 * Standard, boring, well-understood primitives only. There is no custom
 * cryptography anywhere in this file: bcrypt for password verification,
 * `crypto.timingSafeEqual` for token comparison, and the platform CSPRNG for
 * token generation.
 *
 * Defences layered here:
 *
 *  - **bcrypt** with a configurable cost (default 12). Salting is built in, so
 *    identical passwords produce different hashes and precomputed tables are
 *    useless.
 *  - **Uniform failure.** Every failure path returns the same result object and
 *    the route returns one message, so an attacker cannot distinguish "no such
 *    user" from "wrong password" and enumerate accounts.
 *  - **A dummy hash comparison** when the username does not exist. Without it,
 *    a missing user returns in microseconds while a real one takes ~250ms of
 *    bcrypt work, and that timing difference is itself an enumeration oracle.
 *  - **Per-account lockout** on top of the per-IP rate limiter, so an attempt
 *    distributed across many addresses is still throttled.
 *  - **Hashed IPs in the audit trail.** Enough to correlate a burst; not
 *    enough to recover an address from a database dump.
 */

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { query } = require("../db/database");
const { config } = require("../config");
const logger = require("../utils/logger");

/**
 * A real bcrypt hash of a value nobody knows, compared against when the
 * submitted username does not exist. Its only job is to consume the same
 * amount of CPU that a genuine verification would.
 */
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), config.security.bcryptRounds);

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_MINUTES = 15;

/**
 * Pseudonymise a client address for the audit log.
 * Keyed with SESSION_SECRET so the mapping cannot be rebuilt by brute-forcing
 * the (small) IPv4 space against an unkeyed hash.
 */
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHmac("sha256", config.session.secret).update(String(ip)).digest("hex").slice(0, 32);
}

async function recordAttempt({ username, ip, successful, failureReason }) {
  try {
    await query(
      `INSERT INTO admin_login_attempts (username, ip_hash, successful, failure_reason)
       VALUES ($1, $2, $3, $4)`,
      [String(username ?? "").slice(0, 64), hashIp(ip), successful, failureReason ?? null]
    );
  } catch (error) {
    // The audit write must never prevent a legitimate login from completing.
    logger.error("Failed to record login attempt", { message: error.message });
  }
}

/**
 * Verify a username and password.
 *
 * @returns {Promise<{ ok: true, user: { id: number, username: string } } | { ok: false }>}
 *          Deliberately carries no reason on failure. The reason is written to
 *          the audit table and never returned to the caller.
 */
async function verifyCredentials({ username, password, ip }) {
  const submittedUsername = String(username ?? "").trim().toLowerCase();

  const { rows } = await query(
    `SELECT id, username, password_hash, is_active, failed_attempts, locked_until
       FROM admin_users
      WHERE lower(username) = $1
      LIMIT 1`,
    [submittedUsername]
  );

  const user = rows[0];

  if (!user) {
    // Burn the same CPU a real verification would, then fail.
    await bcrypt.compare(String(password ?? ""), DUMMY_HASH);
    await recordAttempt({ username: submittedUsername, ip, successful: false, failureReason: "no_such_user" });
    return { ok: false };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await bcrypt.compare(String(password ?? ""), DUMMY_HASH);
    await recordAttempt({ username: submittedUsername, ip, successful: false, failureReason: "locked" });
    return { ok: false };
  }

  if (!user.is_active) {
    await bcrypt.compare(String(password ?? ""), DUMMY_HASH);
    await recordAttempt({ username: submittedUsername, ip, successful: false, failureReason: "inactive" });
    return { ok: false };
  }

  const passwordMatches = await bcrypt.compare(String(password ?? ""), user.password_hash);

  if (!passwordMatches) {
    const attempts = user.failed_attempts + 1;
    const shouldLock = attempts >= LOCKOUT_THRESHOLD;

    await query(
      `UPDATE admin_users
          SET failed_attempts = $2,
              locked_until = CASE WHEN $3 THEN NOW() + make_interval(mins => $4::INT) ELSE locked_until END
        WHERE id = $1`,
      [user.id, attempts, shouldLock, String(LOCKOUT_MINUTES)]
    );

    if (shouldLock) {
      logger.warn("Administrator account locked after repeated failures", {
        username: submittedUsername,
        minutes: LOCKOUT_MINUTES,
      });
    }

    await recordAttempt({ username: submittedUsername, ip, successful: false, failureReason: "bad_password" });
    return { ok: false };
  }

  await query(
    `UPDATE admin_users
        SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
      WHERE id = $1`,
    [user.id]
  );
  await recordAttempt({ username: submittedUsername, ip, successful: true });

  return { ok: true, user: { id: Number(user.id), username: user.username } };
}

/**
 * Create or update the single administrator account.
 * Called only by `scripts/create-admin.js`; never reachable over HTTP, because
 * a self-service registration endpoint on an admin console is an open door.
 */
async function upsertAdmin({ username, password }) {
  const normalised = String(username).trim();
  if (normalised.length < 3 || normalised.length > 64) {
    throw new Error("Username must be between 3 and 64 characters.");
  }
  const policyError = checkPasswordPolicy(password);
  if (policyError) throw new Error(policyError);

  const hash = await bcrypt.hash(password, config.security.bcryptRounds);

  const { rows } = await query(
    `INSERT INTO admin_users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash,
                   password_changed_at = NOW(),
                   failed_attempts = 0,
                   locked_until = NULL,
                   is_active = TRUE
     RETURNING id, username, (xmax = 0) AS created`,
    [normalised, hash]
  );

  return { id: Number(rows[0].id), username: rows[0].username, created: rows[0].created };
}

/**
 * Minimum password policy for the administrator account.
 * Length is weighted far above character-class rules, which is the current
 * guidance (NIST SP 800-63B) and produces genuinely stronger passwords than
 * forcing a symbol into "Password1".
 */
function checkPasswordPolicy(password) {
  const value = String(password ?? "");
  if (value.length < 12) return "Password must be at least 12 characters.";
  if (value.length > 200) return "Password must be at most 200 characters.";
  if (/^(.)\1+$/.test(value)) return "Password must not be a single repeated character.";
  const weak = ["password", "12345678", "qwerty", "letmein", "admin123", "portfolio"];
  if (weak.some((entry) => value.toLowerCase().includes(entry))) {
    return "Password contains a well-known weak phrase.";
  }
  return null;
}

async function adminAccountExists() {
  const { rows } = await query(`SELECT COUNT(*)::INT AS count FROM admin_users WHERE is_active = TRUE`);
  return rows[0].count > 0;
}

/** Constant-time comparison for CSRF tokens and similar opaque strings. */
function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a ?? ""), "utf8");
  const bufferB = Buffer.from(String(b ?? ""), "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

module.exports = {
  verifyCredentials,
  upsertAdmin,
  checkPasswordPolicy,
  adminAccountExists,
  hashIp,
  safeEqual,
};
