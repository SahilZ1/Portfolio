/**
 * Forward-only SQL migration runner.
 *
 * Migrations are plain .sql files in ./migrations, applied in filename order and
 * recorded in `schema_migrations`. Each file runs inside a transaction, so a
 * failing migration leaves the database exactly as it was.
 *
 * The runner is intentionally forward-only. Down-migrations on an analytics
 * store are a trap: rolling back a column drop cannot bring the data back, so
 * the safe operation is always to write a new forward migration.
 *
 * Usage:  npm run db:migrate          apply all pending
 *         npm run db:migrate:status   list applied/pending without changing anything
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pool } = require("./database");
const logger = require("../utils/logger");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function readMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
      return {
        filename,
        sql,
        checksum: crypto.createHash("sha256").update(sql).digest("hex").slice(0, 16),
      };
    });
}

async function getApplied(client) {
  const { rows } = await client.query("SELECT filename, checksum FROM schema_migrations");
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

async function status() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);
    const files = readMigrationFiles();
    return files.map((file) => ({
      filename: file.filename,
      applied: applied.has(file.filename),
      drifted: applied.has(file.filename) && applied.get(file.filename) !== file.checksum,
    }));
  } finally {
    client.release();
  }
}

async function migrate() {
  const client = await pool.connect();
  let appliedCount = 0;
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);
    const files = readMigrationFiles();

    for (const file of files) {
      if (applied.has(file.filename)) {
        if (applied.get(file.filename) !== file.checksum) {
          // An already-applied file was edited. Silently ignoring this is how
          // environments drift apart; fail loudly and make the author add a new
          // migration instead.
          throw new Error(
            `Migration ${file.filename} has changed since it was applied. ` +
              `Add a new migration rather than editing an applied one.`
          );
        }
        continue;
      }

      logger.info(`Applying migration ${file.filename}`);
      try {
        await client.query("BEGIN");
        await client.query(file.sql);
        await client.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [file.filename, file.checksum]
        );
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Migration ${file.filename} failed: ${error.message}`);
      }
    }
    return appliedCount;
  } finally {
    client.release();
  }
}

module.exports = { migrate, status };

// Allow direct execution: `node src/db/migrate.js [status]`
if (require.main === module) {
  // config/index.js already loaded .env at import time.
  const wantStatus = process.argv.includes("status");

  (async () => {
    if (wantStatus) {
      const rows = await status();
      if (rows.length === 0) {
        console.log("No migration files found.");
      }
      for (const row of rows) {
        const state = row.drifted ? "DRIFTED" : row.applied ? "applied" : "PENDING";
        console.log(`  ${state.padEnd(8)} ${row.filename}`);
      }
    } else {
      const count = await migrate();
      console.log(count === 0 ? "Database already up to date." : `Applied ${count} migration(s).`);
    }
    await pool.end();
  })().catch((error) => {
    console.error(error.message);
    pool.end().finally(() => process.exit(1));
  });
}
