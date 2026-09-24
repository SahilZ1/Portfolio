#!/usr/bin/env node
/**
 * Enforce the analytics retention window on demand.
 *
 * The server already prunes on a timer, but having this as a standalone command
 * means retention can be run from a cron job or verified by hand. A retention
 * policy that is documented but never executed is not a policy.
 */

const { config } = require("../src/config");
const { pruneOldData, closeStaleSessions } = require("../src/services/trackingService");
const { pool } = require("../src/db/database");

(async () => {
  const closed = await closeStaleSessions();
  const removed = await pruneOldData();
  console.log(`Closed ${closed} stale session(s).`);
  console.log(`Removed ${removed} visitor record(s) older than ${config.analytics.retentionDays} days.`);
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
