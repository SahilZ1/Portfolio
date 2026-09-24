/**
 * Liveness and readiness.
 *
 * Preserves the original GET /api/health contract exactly -- `status: "online"`,
 * `database: "connected"` -- because the platform load balancer and any existing
 * tooling depend on it. Extra fields are additive.
 */

const express = require("express");
const { healthcheck } = require("../db/database");
const { config } = require("../config");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    try {
      const databaseTime = await healthcheck();
      res.json({
        status: "online",
        service: "Portfolio Analytics API",
        database: "connected",
        databaseTime,
        environment: config.env,
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch (error) {
      // A degraded database is a 503, not a 500: the service is alive but not
      // ready, which is what an orchestrator needs to know to stop sending it
      // traffic without killing the container.
      res.status(503).json({
        status: "degraded",
        service: "Portfolio Analytics API",
        database: "disconnected",
      });
    }
  })
);

module.exports = router;
