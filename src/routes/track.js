/**
 * Public analytics ingest.
 *
 * Mounted at /api/track. These are the only write endpoints exposed to
 * unauthenticated traffic, so they are the application's main attack surface
 * and are treated accordingly:
 *
 *  - Rate limited per IP.
 *  - Body size capped well below the global limit.
 *  - Every field parsed through a zod schema; unknown event types rejected.
 *  - The visitor identifier comes from the HttpOnly cookie set server-side,
 *    never from the request body, so a client cannot write into another
 *    visitor's history by naming them.
 *  - Responses are deliberately uninformative. Whether a hit was stored, and
 *    why not if it was not, is server-side information.
 *
 * Every handler returns 204 on success. There is nothing for the client to do
 * with a tracking response, and an empty body keeps the beacon cheap.
 */

const express = require("express");
const { asyncHandler, httpError } = require("../middleware/errorHandler");
const { trackingLimiter } = require("../middleware/rateLimit");
const { clearVisitorCookie } = require("../middleware/visitorTracker");
const { pageViewSchema, eventSchema } = require("../utils/validate");
const tracking = require("../services/trackingService");
const logger = require("../utils/logger");

const router = express.Router();

// A tracking payload is a few hundred bytes. 4kb is generous and still refuses
// anything that looks like an attempt to push bulk data through this door.
const jsonBody = express.json({ limit: "4kb" });

router.use(trackingLimiter, jsonBody);

/**
 * POST /api/track/pageview
 * Called by the SPA on every route change.
 */
router.post(
  "/pageview",
  asyncHandler(async (req, res) => {
    const parsed = pageViewSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw httpError(400, "invalid_payload", "Invalid page view payload.");
    }

    await tracking.recordPageView({
      visitorUuid: req.visitorUuid,
      path: parsed.data.path,
      title: parsed.data.title,
      // Prefer the client-reported referrer (document.referrer at first load)
      // and fall back to the header. On an SPA the header is the previous
      // internal page, which the referrer service classifies as `internal`.
      referrer: parsed.data.referrer || req.get("referer") || null,
      userAgent: req.get("user-agent"),
    });

    res.status(204).end();
  })
);

/**
 * POST /api/track/event
 * Discrete interactions: outbound clicks, CTA presses, resume downloads.
 */
router.post(
  "/event",
  asyncHandler(async (req, res) => {
    const parsed = eventSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw httpError(400, "invalid_payload", "Invalid event payload.");
    }

    await tracking.recordEvent({
      visitorUuid: req.visitorUuid,
      type: parsed.data.type,
      path: parsed.data.path ?? null,
      data: parsed.data.data ?? null,
      userAgent: req.get("user-agent"),
    });

    res.status(204).end();
  })
);

/**
 * POST /api/track/opt-out
 * Backs the control on /privacy. Clearing the cookie is a real opt-out: the
 * next visit receives a brand-new identifier that cannot be linked to this one,
 * and the browser stops carrying the old value entirely.
 */
router.post(
  "/opt-out",
  asyncHandler(async (req, res) => {
    clearVisitorCookie(res);
    logger.info("Visitor opted out of analytics");
    res.status(204).end();
  })
);

module.exports = router;
