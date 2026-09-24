/**
 * Anonymous visitor identification.
 *
 * Issues and reads the first-party `portfolio_visitor` cookie and attaches the
 * resulting identifier to `req.visitorUuid`. That is all it does.
 *
 * What changed from the original implementation, and why
 * ------------------------------------------------------
 * The first version wrote to PostgreSQL on every request: an INSERT for a new
 * visitor, an UPDATE for a returning one. Mounted globally that fires for the
 * HTML document, every JS and CSS asset, every font, every favicon probe and
 * every health check -- dozens of writes and pool checkouts per page load, with
 * `last_seen` being rewritten by asset requests rather than by real activity.
 *
 * Database work now belongs to the ingest endpoints in routes/track.js, which
 * run once per actual navigation. This middleware stays synchronous and free of
 * I/O, so it can sit in front of the whole app without cost.
 *
 * Cookie settings, and the reason for each
 * ----------------------------------------
 * httpOnly: true    JavaScript cannot read the identifier. The tracking client
 *                   never needs it -- the cookie travels automatically on the
 *                   same-origin fetch -- so exposing it to the DOM would only
 *                   hand an XSS payload a stable cross-visit identifier.
 * sameSite: 'lax'   The cookie is sent on top-level navigations (so arriving
 *                   from LinkedIn is attributed correctly) but not on
 *                   cross-site subrequests, which is a CSRF control as well as
 *                   a privacy one.
 * secure            Set in production so the identifier is never transmitted in
 *                   cleartext. Off in development because localhost is HTTP.
 * maxAge: 365d      Long enough for returning-visitor analysis to mean
 *                   something; not a permanent identifier.
 * signed: false     The value is a random v4 UUID with no meaning; a forged one
 *                   creates a junk row and nothing more. A signature would add
 *                   ceremony, not security.
 * path: '/'         One identifier for the whole site.
 *
 * The value itself comes from crypto.randomUUID(), which is backed by the
 * platform CSPRNG. It is not derived from anything about the visitor: no IP, no
 * User-Agent, no canvas, no clock skew. Two people on the same machine and
 * network receive unrelated identifiers, and the same person in a private
 * window is a different visitor. That is a deliberate accuracy trade-off in
 * favour of not fingerprinting.
 */

const crypto = require("crypto");
const { config } = require("../config");

/** Matches a v4 UUID. Anything else in the cookie is treated as absent. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    maxAge: config.analytics.visitorCookieMaxAgeMs,
    path: "/",
  };
}

/**
 * Paths where a *new* identifier must never be issued.
 *
 * Without this, a visitor with no cookie who opts out would be handed a fresh
 * identifier by this middleware and have it deleted by the route a moment
 * later. The end state is correct either way, but emitting a tracking cookie
 * to someone in the act of opting out is the wrong thing to put on the wire.
 */
const NO_ISSUE_PATHS = new Set(["/api/track/opt-out"]);

function visitorTracker(req, res, next) {
  const cookieName = config.analytics.visitorCookieName;
  const existing = req.cookies?.[cookieName];

  if (UUID_V4.test(existing ?? "")) {
    req.visitorUuid = existing;
    req.isNewVisitorCookie = false;
    return next();
  }

  if (NO_ISSUE_PATHS.has(req.path)) {
    req.visitorUuid = null;
    req.isNewVisitorCookie = false;
    return next();
  }

  // Either no cookie, or a malformed value (truncated, tampered with, or left
  // over from an older format). Issue a fresh identifier rather than trusting
  // whatever arrived -- the value reaches SQL, and only a well-formed UUID
  // should ever get that far.
  const visitorUuid = crypto.randomUUID();
  res.cookie(cookieName, visitorUuid, cookieOptions());
  req.visitorUuid = visitorUuid;
  req.isNewVisitorCookie = true;
  return next();
}

/**
 * Clear the visitor cookie. Backs the opt-out control on /privacy: a visitor
 * who opts out has their identifier removed, so subsequent visits cannot be
 * linked to previous ones.
 */
function clearVisitorCookie(res) {
  res.clearCookie(config.analytics.visitorCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
  });
}

module.exports = visitorTracker;
module.exports.visitorTracker = visitorTracker;
module.exports.clearVisitorCookie = clearVisitorCookie;
module.exports.UUID_V4 = UUID_V4;
