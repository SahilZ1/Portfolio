/**
 * Administrator authentication endpoints. Mounted at /api/admin/auth.
 *
 * The login endpoint is the only unauthenticated POST on the admin surface, so
 * it carries the strict rate limiter and returns one identical error for every
 * failure mode.
 */

const express = require("express");
const { asyncHandler, httpError } = require("../middleware/errorHandler");
const { loginLimiter } = require("../middleware/rateLimit");
const { verifyCredentials, adminAccountExists } = require("../services/authService");
const {
  requireAdmin,
  requireCsrfToken,
  issueCsrfToken,
  regenerateSession,
  destroySession,
} = require("../middleware/requireAdmin");
const { config } = require("../config");
const logger = require("../utils/logger");

const router = express.Router();
const jsonBody = express.json({ limit: "2kb" });

/**
 * GET /api/admin/auth/session
 * Lets the dashboard decide whether to render or redirect without a failed
 * request in the console. Also the endpoint that hands out the CSRF token.
 */
router.get(
  "/session",
  asyncHandler(async (req, res) => {
    if (!req.session?.admin?.id) {
      return res.json({ authenticated: false, setupRequired: !(await adminAccountExists()) });
    }
    res.json({
      authenticated: true,
      user: { username: req.session.admin.username },
      csrfToken: issueCsrfToken(req),
      expiresInMs: config.session.ttlMs,
    });
  })
);

/**
 * POST /api/admin/auth/login
 *
 * One failure message for every failure: wrong username, wrong password,
 * locked account and inactive account are indistinguishable from the outside.
 * The specific reason is recorded in admin_login_attempts for audit.
 */
router.post(
  "/login",
  loginLimiter,
  jsonBody,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      throw httpError(400, "invalid_credentials", "Username and password are required.");
    }
    // Bound the input before it reaches bcrypt: hashing an unbounded string is
    // a cheap way for a client to buy expensive CPU time.
    if (username.length > 64 || password.length > 200) {
      throw httpError(400, "invalid_credentials", "Invalid username or password.");
    }

    const result = await verifyCredentials({ username, password, ip: req.ip });

    if (!result.ok) {
      throw httpError(401, "invalid_credentials", "Invalid username or password.");
    }

    // Session fixation defence: a brand-new session id is issued at exactly the
    // moment privileges change.
    await regenerateSession(req);
    req.session.admin = { id: result.user.id, username: result.user.username, at: Date.now() };

    logger.info("Administrator signed in", { username: result.user.username });

    res.json({
      authenticated: true,
      user: { username: result.user.username },
      csrfToken: req.session.csrfToken,
    });
  })
);

/**
 * POST /api/admin/auth/logout
 * CSRF-protected: a forced logout is a genuine, if minor, state change.
 */
router.post(
  "/logout",
  requireAdmin,
  requireCsrfToken,
  asyncHandler(async (req, res) => {
    const username = req.session?.admin?.username;
    await destroySession(req, res, config.session.name);
    logger.info("Administrator signed out", { username });
    res.status(204).end();
  })
);

module.exports = router;
