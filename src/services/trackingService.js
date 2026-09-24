/**
 * Analytics ingest: the write side of the system.
 *
 * Implements the visitor -> session -> page_view -> event chain.
 *
 *   visitor   long-lived, pseudonymous, one per browser profile
 *     |
 *   session   a visit; ends after 30 minutes of inactivity
 *     |
 *   page_view one per SPA route change
 *     |
 *   event     an explicit interaction (outbound click, CTA, download)
 *
 * Two design decisions worth stating:
 *
 * 1. **The middleware does not write to the database.** The original
 *    implementation ran an UPDATE on every HTTP request, including favicons and
 *    static assets, which inflated `last_seen` and spent a connection per asset.
 *    Visitor rows are now created and touched only when the client reports a
 *    real page view, so one navigation is one write path.
 *
 * 2. **A returning visitor stays the same visitor.** A new session is created
 *    when the previous one has gone stale, but it is attached to the existing
 *    `visitors` row via the cookie UUID, which is what makes the returning
 *    visitor percentage meaningful.
 */

const { query, transaction } = require("../db/database");
const { config } = require("../config");
const logger = require("../utils/logger");
const { classify } = require("./userAgent");
const { attribute } = require("./referrer");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Guards against a client posting junk in place of its own cookie value. */
function isValidUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * Create the visitor row if this UUID is new, otherwise touch `last_seen`.
 * A single round trip via ON CONFLICT: two statements would race between
 * concurrent requests from the same browser (e.g. two tabs restored at once).
 *
 * @returns {Promise<{ id: number, isNew: boolean }>}
 */
async function upsertVisitor(client, visitorUuid) {
  const { rows } = await client.query(
    `INSERT INTO visitors (visitor_uuid, first_seen, last_seen)
     VALUES ($1, NOW(), NOW())
     ON CONFLICT (visitor_uuid)
     DO UPDATE SET last_seen = NOW()
     RETURNING id, (xmax = 0) AS is_new`,
    [visitorUuid]
  );
  return { id: Number(rows[0].id), isNew: rows[0].is_new };
}

/**
 * Return the visitor's live session, or start a new one.
 *
 * "Live" means the last recorded activity is inside the inactivity window and
 * the session has not been explicitly ended. When a stale session is found it
 * is closed first, so `ended_at` and session duration stay accurate instead of
 * trailing off into NULL.
 */
async function resolveSession(client, visitor, context) {
  const timeoutSeconds = Math.round(config.analytics.sessionTimeoutMs / 1000);

  const existing = await client.query(
    `SELECT id, session_uuid, is_bot
       FROM sessions
      WHERE visitor_id = $1
        AND ended_at IS NULL
        AND last_activity > NOW() - make_interval(secs => $2::INT)
      ORDER BY last_activity DESC
      LIMIT 1`,
    [visitor.id, String(timeoutSeconds)]
  );

  if (existing.rows.length > 0) {
    await client.query(`UPDATE sessions SET last_activity = NOW() WHERE id = $1`, [
      existing.rows[0].id,
    ]);
    return {
      id: Number(existing.rows[0].id),
      sessionUuid: existing.rows[0].session_uuid,
      isBot: existing.rows[0].is_bot,
      isNew: false,
    };
  }

  // Close anything left dangling for this visitor before opening a new session,
  // so a visitor never has two open sessions at once.
  await client.query(
    `UPDATE sessions
        SET ended_at = last_activity
      WHERE visitor_id = $1 AND ended_at IS NULL`,
    [visitor.id]
  );

  const ua = classify(context.userAgent);
  const ref = attribute(context.referrer);

  const { rows } = await client.query(
    `INSERT INTO sessions (
        session_uuid, visitor_id, started_at, last_activity,
        entry_page, referrer, referrer_host, traffic_source,
        device_category, browser_family, os_family, is_bot
     )
     VALUES (gen_random_uuid(), $1, NOW(), NOW(), $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, session_uuid`,
    [
      visitor.id,
      context.path,
      ref.url,
      ref.host,
      ref.source,
      ua.deviceCategory,
      ua.browserFamily,
      ua.osFamily,
      ua.isBot,
    ]
  );

  await client.query(`UPDATE visitors SET session_count = session_count + 1 WHERE id = $1`, [
    visitor.id,
  ]);

  return {
    id: Number(rows[0].id),
    sessionUuid: rows[0].session_uuid,
    isBot: ua.isBot,
    isNew: true,
  };
}

/**
 * Record a page view and keep the session's derived state in step.
 *
 * Side effects, all inside one transaction:
 *  - closes out the previous view's `duration_seconds`
 *  - advances `view_sequence`
 *  - moves the session's `exit_page` forward (the last view is the exit page)
 *  - increments the denormalised `page_view_count`
 *
 * @returns {Promise<{ sessionUuid: string, isNewSession: boolean, sequence: number }>}
 */
async function recordPageView({ visitorUuid, path, title, referrer, userAgent }) {
  if (!isValidUuid(visitorUuid)) {
    throw Object.assign(new Error("Invalid visitor identifier"), { statusCode: 400 });
  }

  return transaction(async (client) => {
    const visitor = await upsertVisitor(client, visitorUuid);
    const session = await resolveSession(client, visitor, { path, referrer, userAgent });

    // Close the previous view's dwell time. Bounded at one hour: a tab left open
    // overnight should not contribute an eight-hour "time on page".
    await client.query(
      `UPDATE page_views pv
          SET duration_seconds = LEAST(3600, GREATEST(0, EXTRACT(EPOCH FROM (NOW() - pv.viewed_at))::INT))
        WHERE pv.id = (
          SELECT id FROM page_views
           WHERE session_id = $1 AND duration_seconds IS NULL
           ORDER BY view_sequence DESC
           LIMIT 1
        )`,
      [session.id]
    );

    const { rows } = await client.query(
      `INSERT INTO page_views (session_id, path, page_title, view_sequence)
       VALUES (
         $1, $2, $3,
         (SELECT COALESCE(MAX(view_sequence), 0) + 1 FROM page_views WHERE session_id = $1)
       )
       RETURNING view_sequence`,
      [session.id, path, title]
    );

    await client.query(
      `UPDATE sessions
          SET last_activity   = NOW(),
              exit_page       = $2,
              entry_page      = COALESCE(entry_page, $2),
              page_view_count = page_view_count + 1
        WHERE id = $1`,
      [session.id, path]
    );

    return {
      sessionUuid: session.sessionUuid,
      isNewSession: session.isNew,
      sequence: rows[0].view_sequence,
    };
  });
}

/**
 * Record a discrete interaction event against the visitor's current session.
 *
 * An event never creates a session: if the client sends an event before any
 * page view (which should not happen, but a race or a replayed request could),
 * we drop it rather than inventing a session with no entry page. The caller
 * receives a 202-style "accepted but not stored" result instead of an error,
 * because analytics failures must never surface in the user's browser.
 */
async function recordEvent({ visitorUuid, type, path, data, userAgent }) {
  if (!isValidUuid(visitorUuid)) {
    throw Object.assign(new Error("Invalid visitor identifier"), { statusCode: 400 });
  }

  const ua = classify(userAgent);
  if (ua.isBot) return { stored: false, reason: "bot" };

  return transaction(async (client) => {
    const { rows: sessionRows } = await client.query(
      `SELECT s.id
         FROM sessions s
         JOIN visitors v ON v.id = s.visitor_id
        WHERE v.visitor_uuid = $1
          AND s.ended_at IS NULL
          AND s.last_activity > NOW() - make_interval(secs => $2::INT)
        ORDER BY s.last_activity DESC
        LIMIT 1`,
      [visitorUuid, String(Math.round(config.analytics.sessionTimeoutMs / 1000))]
    );

    if (sessionRows.length === 0) return { stored: false, reason: "no_active_session" };
    const sessionId = Number(sessionRows[0].id);

    await client.query(
      `INSERT INTO events (session_id, event_type, page_path, event_data)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, type, path ?? null, data ? JSON.stringify(data) : null]
    );

    await client.query(
      `UPDATE sessions
          SET last_activity = NOW(), event_count = event_count + 1
        WHERE id = $1`,
      [sessionId]
    );

    return { stored: true };
  });
}

/**
 * Close sessions that have passed the inactivity window.
 *
 * Without this, a session only ends when the same visitor returns, so
 * "currently active" counts and average durations drift. Run periodically from
 * the server's maintenance timer.
 *
 * @returns {Promise<number>} number of sessions closed
 */
async function closeStaleSessions() {
  const { rowCount } = await query(
    `UPDATE sessions
        SET ended_at = last_activity
      WHERE ended_at IS NULL
        AND last_activity < NOW() - make_interval(secs => $1::INT)`,
    [String(Math.round(config.analytics.sessionTimeoutMs / 1000))]
  );
  if (rowCount > 0) logger.debug("Closed stale sessions", { count: rowCount });
  return rowCount;
}

/**
 * Delete analytics rows older than the retention window documented on /privacy.
 *
 * Deleting visitors cascades to sessions, page views and events, so retention
 * is enforced at the root of the graph. A retention promise that is not
 * actually executed is worse than no promise at all.
 *
 * @returns {Promise<number>} number of visitor records removed
 */
async function pruneOldData() {
  const days = config.analytics.retentionDays;
  const { rowCount } = await query(
    `DELETE FROM visitors
      WHERE last_seen < NOW() - make_interval(days => $1::INT)`,
    [String(days)]
  );
  if (rowCount > 0) logger.info("Pruned expired analytics data", { visitors: rowCount, days });
  return rowCount;
}

module.exports = {
  recordPageView,
  recordEvent,
  closeStaleSessions,
  pruneOldData,
  isValidUuid,
};
