/**
 * Private analytics API. Mounted at /api/admin/analytics.
 *
 * Every route in this router sits behind `requireAdmin`, applied once at the
 * router level rather than per handler -- a per-route guard is one forgotten
 * line away from an unauthenticated data leak.
 *
 * All query parameters pass through the shared `rangeSchema`, which bounds
 * `days` to 1..365 and `limit` to 1..100. Nothing from the query string is ever
 * interpolated into SQL.
 */

const express = require("express");
const { asyncHandler, httpError } = require("../middleware/errorHandler");
const { requireAdmin } = require("../middleware/requireAdmin");
const { rangeSchema } = require("../utils/validate");
const analytics = require("../services/analyticsService");
const insights = require("../services/insightsService");

const router = express.Router();

router.use(requireAdmin);

/** Parse and bound ?days= and ?limit= for every handler below. */
function range(req) {
  const parsed = rangeSchema.safeParse(req.query);
  if (!parsed.success) {
    throw httpError(400, "invalid_query", "Invalid query parameters.");
  }
  return parsed.data;
}

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const { days } = range(req);
    res.json(await analytics.getOverview({ days }));
  })
);

router.get(
  "/traffic",
  asyncHandler(async (req, res) => {
    const { days } = range(req);
    res.json({ days, series: await analytics.getTrafficSeries({ days }) });
  })
);

router.get(
  "/pages",
  asyncHandler(async (req, res) => {
    const { days, limit } = range(req);
    res.json(await analytics.getPages({ days, limit }));
  })
);

router.get(
  "/sources",
  asyncHandler(async (req, res) => {
    const { days, limit } = range(req);
    res.json(await analytics.getSources({ days, limit }));
  })
);

router.get(
  "/devices",
  asyncHandler(async (req, res) => {
    const { days } = range(req);
    res.json(await analytics.getDevices({ days }));
  })
);

router.get(
  "/flows",
  asyncHandler(async (req, res) => {
    const { days, limit } = range(req);
    res.json(await analytics.getFlows({ days, limit }));
  })
);

router.get(
  "/events",
  asyncHandler(async (req, res) => {
    const { days, limit } = range(req);
    res.json(await analytics.getEvents({ days, limit }));
  })
);

router.get(
  "/activity",
  asyncHandler(async (req, res) => {
    const { limit } = range(req);
    res.json({ activity: await analytics.getRecentActivity({ limit }) });
  })
);

/**
 * AI-assisted commentary. `?refresh=1` bypasses the cache; it is rate limited
 * only by the general API limiter because the expensive path is additionally
 * guarded by the cache digest.
 */
router.get(
  "/insights",
  asyncHandler(async (req, res) => {
    const { days } = range(req);
    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";
    res.json(await insights.getInsights({ days, forceRefresh }));
  })
);

/**
 * The exact aggregate payload that would be sent to an AI provider.
 *
 * Exposed so the boundary is inspectable rather than a claim in a README: the
 * administrator can see precisely what leaves the server, and confirm it
 * contains only counts, rates and paths.
 */
router.get(
  "/insights/snapshot",
  asyncHandler(async (req, res) => {
    const { days } = range(req);
    res.json(await insights.buildSnapshot({ days }));
  })
);

module.exports = router;
