/**
 * Authorisation guard and CSRF protection for the admin surface.
 *
 * Authentication state lives entirely server-side, in the PostgreSQL-backed
 * session store. The browser holds only an opaque signed session id in an
 * HttpOnly cookie. Nothing about the admin's identity or privileges is
 * transmitted to, or trusted from, the client -- so there is no token for
 * JavaScript to leak and no claim for a client to forge.
 */

const crypto = require("crypto");
const { httpError } = require("./errorHandler");
const { safeEqual } = require("../services/authService");
const logger = require("../utils/logger");

/**
 * Reject any request that does not carry an authenticated admin session.
 *
 * Returns 401 with a stable code so the dashboard can redirect to the login
 * screen rather than rendering an error.
 */
function requireAdmin(req, res, next) {
  if (req.session?.admin?.id) {
    return next();
  }
  return next(httpError(401, "unauthenticated", "Authentication required."));
}

/**
 * Double-submit CSRF protection for state-changing admin requests.
 *
 * The session cookie is already `SameSite=Strict`, which blocks cross-site form
 * posts and navigations in every browser that honours it. This is the second
 * layer: a random token is generated per session, handed to the dashboard over
 * an authenticated GET, and must be echoed in the `X-CSRF-Token` header. An
 * attacker's page can cause a cross-site request but cannot read the token to
 * put in the header, because same-origin policy stops it reading our responses.
 *
 * Safe methods are exempt: they must not change state, so there is nothing to
 * protect, and requiring a token on GET would break bookmarking the dashboard.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function issueCsrfToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("base64url");
  }
  return req.session.csrfToken;
}

function requireCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const expected = req.session?.csrfToken;
  const provided = req.get("x-csrf-token");

  if (!expected || !provided || !safeEqual(expected, provided)) {
    logger.warn("CSRF token rejected", { path: req.path, method: req.method });
    return next(httpError(403, "csrf_failed", "Invalid or missing CSRF token."));
  }
  return next();
}

/**
 * Regenerate the session id while preserving its contents.
 *
 * Called immediately after a successful login. Without it, a session id issued
 * to an unauthenticated visitor would be promoted to an authenticated one --
 * session fixation, where an attacker who plants a known id in the victim's
 * browser ends up holding a valid admin session.
 */
function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    const preserved = { ...req.session };
    req.session.regenerate((error) => {
      if (error) return reject(error);
      // Carry nothing over except a freshly minted CSRF token; the old token
      // belonged to the old session id.
      delete preserved.cookie;
      delete preserved.csrfToken;
      Object.assign(req.session, preserved);
      req.session.csrfToken = crypto.randomBytes(32).toString("base64url");
      resolve();
    });
  });
}

/** Destroy the session server-side and clear the cookie. */
function destroySession(req, res, cookieName) {
  return new Promise((resolve) => {
    if (!req.session) return resolve();
    req.session.destroy(() => {
      // Deleting the row is the real logout; clearing the cookie is tidiness.
      res.clearCookie(cookieName, { path: "/" });
      resolve();
    });
  });
}

module.exports = { requireAdmin, requireCsrfToken, issueCsrfToken, regenerateSession, destroySession };
