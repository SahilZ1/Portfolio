/**
 * Test setup.
 *
 * Forces NODE_ENV=test before config is imported, which switches logging to
 * silent and keeps the production secret assertions out of the way.
 *
 * IMPORTANT: the suite truncates the analytics tables. It therefore refuses to
 * run against a database whose name does not look like a test database unless
 * ALLOW_DESTRUCTIVE_TESTS is set. Wiping a real analytics history because a
 * test file was run against the wrong DATABASE_URL is exactly the kind of
 * accident this guard exists to prevent.
 */

// NOTE: NODE_ENV and LOG_LEVEL are set by vitest.config.js `test.env`, not
// here. ES module imports are hoisted above ordinary statements, so assigning
// them in this file would run *after* ../src/config had already read them.

import { createRequire } from "module";
import { config } from "../src/config";
import { pool, query } from "../src/db/database";

/**
 * Load a source module exactly as the application does.
 *
 * This matters more than it looks. The source tree is CommonJS, and Vitest
 * transforms `import` statements through Vite while `require()` calls inside
 * the source (for example app.js requiring its middleware) are resolved by
 * Node. Those two paths produce SEPARATE module instances with separate
 * module-level state.
 *
 * So a test that imports the rate limiter with `import` and resets it is
 * resetting a different object than the one the running app is using. Anything
 * a test needs to reach *by identity* -- in-memory stores, caches, singletons --
 * must be loaded through this helper instead.
 */
export const appRequire = createRequire(import.meta.url);

const looksLikeTestDatabase =
  /test/i.test(config.db.database) || process.env.ALLOW_DESTRUCTIVE_TESTS === "1";

if (!looksLikeTestDatabase) {
  throw new Error(
    `Refusing to run destructive tests against database "${config.db.database}".\n` +
      `Either point DB_NAME at a database with "test" in its name, or set\n` +
      `ALLOW_DESTRUCTIVE_TESTS=1 if you accept that its analytics data will be erased.`
  );
}

/** Remove all analytics and auth rows, leaving the schema intact. */
async function resetDatabase() {
  // TRUNCATE ... CASCADE handles the foreign keys and resets the sequences, so
  // ids are predictable between test files.
  await query(`
    TRUNCATE TABLE events, page_views, sessions, visitors,
                   admin_login_attempts, admin_users, ai_insight_cache,
                   "session"
    RESTART IDENTITY CASCADE
  `);
}

module.exports = { resetDatabase, pool, query };

// Vitest setup files may export hooks via globals.
globalThis.__resetDatabase = resetDatabase;

// Close the pool once the whole run finishes, or the process hangs.
process.on("beforeExit", () => {
  pool.end().catch(() => {});
});
