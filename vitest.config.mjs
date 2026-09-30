import { defineConfig } from "vitest/config";

/**
 * Test configuration.
 *
 * The suite runs against a real PostgreSQL database rather than mocks. The
 * analytics layer's correctness lives almost entirely in its SQL — session
 * windowing, sequence numbering, aggregate filters — and a mocked `pg` would
 * verify that the strings were assembled, not that the queries are right.
 *
 * `fileParallelism: false` because the tests share one database and truncate
 * between files; parallel workers would race on that shared state.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Set before any module is imported. Doing this in a setup file would be
    // too late: ES module imports hoist above statements, so src/config would
    // already have read process.env.
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      // Guard rail: the suite truncates tables, so it runs against its own
      // database. Override DB_NAME in .env only if you know what you are doing.
      DB_NAME: process.env.TEST_DB_NAME || "portfolio_analytics_test",
      // Live collection is off by default on the deployed site, which leaves
      // the ingest routes unmounted. The implementation is still shipped and
      // still has to be correct, so the suite mounts and exercises it.
      ANALYTICS_ENABLED: "true",
    },
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
