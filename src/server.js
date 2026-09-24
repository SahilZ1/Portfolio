/**
 * Process entry point.
 *
 * Responsible only for lifecycle: validate the environment, verify the
 * database, bind the port, run maintenance, and shut down cleanly. The
 * application itself is built in app.js.
 */

const { config, assertProductionSecrets } = require("./config");
const { createApp } = require("./app");
const { healthcheck, close: closeDatabase } = require("./db/database");
const { status: migrationStatus } = require("./db/migrate");
const { closeStaleSessions, pruneOldData } = require("./services/trackingService");
const logger = require("./utils/logger");

/** How often to close timed-out sessions and enforce data retention. */
const MAINTENANCE_INTERVAL_MS = 5 * 60 * 1000;

async function verifyDatabase() {
  await healthcheck();

  const pending = (await migrationStatus()).filter((row) => !row.applied);
  if (pending.length > 0) {
    // A schema behind the code produces confusing column-not-found errors at
    // request time. Say so plainly at boot instead.
    logger.warn(
      `${pending.length} pending migration(s). Run "npm run db:migrate" before serving traffic.`,
      { pending: pending.map((row) => row.filename) }
    );
  }
}

/**
 * Periodic maintenance.
 *
 * Closing stale sessions keeps duration and "active now" figures honest;
 * pruning enforces the retention window promised on /privacy. Both are
 * best-effort: a failure is logged and retried on the next tick rather than
 * taking the process down.
 */
function startMaintenance() {
  const tick = async () => {
    try {
      await closeStaleSessions();
      await pruneOldData();
    } catch (error) {
      logger.error("Maintenance tick failed", { message: error.message });
    }
  };

  const timer = setInterval(tick, MAINTENANCE_INTERVAL_MS);
  // Do not hold the event loop open purely for maintenance.
  timer.unref();
  tick();
  return timer;
}

async function start() {
  assertProductionSecrets();
  await verifyDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Portfolio server listening on http://localhost:${config.port}`, {
      environment: config.env,
    });
  });

  const maintenanceTimer = startMaintenance();

  /**
   * Graceful shutdown. Platforms send SIGTERM and then kill the process after a
   * grace period, so in-flight requests must be allowed to finish and the pool
   * must be drained, or connections leak on every redeploy.
   */
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}; shutting down`);

    clearInterval(maintenanceTimer);

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out; exiting immediately");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await closeDatabase();
      } catch (error) {
        logger.error("Error closing database pool", { message: error.message });
      }
      clearTimeout(forceExit);
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // An unhandled rejection leaves the process in an unknown state. Log it with
  // full detail and exit so the platform restarts a clean one.
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { message: error.message, stack: error.stack });
    shutdown("uncaughtException");
  });

  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error("Failed to start server", { message: error.message });
    process.exit(1);
  });
}

module.exports = { start };
