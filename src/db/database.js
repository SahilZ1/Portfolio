/**
 * The single PostgreSQL connection pool for the whole application.
 *
 * There is exactly one pool per process, created here and imported everywhere.
 * Creating a second pool elsewhere would silently double the connection count
 * against the database's `max_connections` limit.
 */

const { Pool } = require("pg");
const { config } = require("../config");
const logger = require("../utils/logger");

const poolConfig = config.db.connectionString
  ? {
      connectionString: config.db.connectionString,
      // Managed providers terminate TLS with their own CA. `rejectUnauthorized:
      // false` is the documented setting for Neon/Render/Supabase pooled URLs;
      // it is opt-in via DB_SSL so local development stays strict-by-absence.
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: config.db.maxConnections,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
  application_name: "portfolio_analytics",
});

pool.on("error", (error) => {
  // Fired for idle clients dropped by the server. Never fatal: the pool will
  // open a fresh connection on the next checkout.
  logger.error("Unexpected PostgreSQL client error", { message: error.message });
});

/**
 * Run a parameterised query.
 *
 * Every call site in this codebase passes values through `params` — string
 * concatenation into SQL is never used, which is what makes the analytics
 * ingest endpoints safe against injection despite accepting browser input.
 */
async function query(text, params) {
  const startedAt = process.hrtime.bigint();
  try {
    const result = await pool.query(text, params);
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (ms > 250) {
      logger.warn("Slow query", { ms: Math.round(ms), sql: text.trim().split("\n")[0].slice(0, 120) });
    }
    return result;
  } catch (error) {
    // Log the statement shape, never the bound parameters: those can contain
    // page paths and referrers we would rather not persist to log storage.
    logger.error("Query failed", {
      message: error.message,
      code: error.code,
      sql: text.trim().split("\n")[0].slice(0, 120),
    });
    throw error;
  }
}

/** Run a set of statements inside a single transaction. */
async function transaction(handler) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function healthcheck() {
  const result = await query("SELECT NOW() AS database_time");
  return result.rows[0].database_time;
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, transaction, healthcheck, close };
