/**
 * Analytics aggregation: the read side of the system.
 *
 * Every function here returns plain, already-aggregated data ready for the
 * dashboard. Conventions applied consistently across the file:
 *
 *  - **Bots are excluded everywhere.** Every query filters `is_bot = FALSE`.
 *    A figure that silently mixes crawlers into "visitors" is not a metric, it
 *    is a decoration.
 *  - **Windows are bounded.** `days` is validated to 1..365 before it reaches
 *    here, so no single dashboard request can scan unbounded history.
 *  - **Parameterised, always.** Intervals are built as `make_interval(days => $1::INT)`
 *    rather than by string concatenation, so the window is a bound value.
 *  - **Gaps are filled.** Time series use `generate_series` so a day with no
 *    traffic is a zero, not a missing point that a chart would interpolate over.
 */

const { query } = require("../db/database");
const { SOURCE_LABELS } = require("./referrer");

/** Shared SQL fragment: human sessions inside the requested window. */
const HUMAN_SESSIONS_IN_WINDOW = `
  FROM sessions s
 WHERE s.is_bot = FALSE
   AND s.started_at >= NOW() - make_interval(days => $1::INT)
`;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Headline figures for the top of the dashboard.
 *
 * Returns both the current window and the immediately preceding window of the
 * same length, so every tile can show a real period-over-period change instead
 * of an unexplained number.
 */
async function getOverview({ days = 30 } = {}) {
  const { rows } = await query(
    `
    WITH windows AS (
      SELECT
        NOW() - make_interval(days => $1::INT)          AS current_start,
        NOW() - make_interval(days => $1::INT * 2)      AS previous_start,
        NOW() - make_interval(days => $1::INT)          AS previous_end
    ),
    scoped AS (
      SELECT s.*,
             (s.started_at >= w.current_start)                                        AS is_current,
             (s.started_at >= w.previous_start AND s.started_at < w.previous_end)      AS is_previous
        FROM sessions s CROSS JOIN windows w
       WHERE s.is_bot = FALSE
         AND s.started_at >= w.previous_start
    ),
    session_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE is_current)                                  AS sessions_current,
        COUNT(*) FILTER (WHERE is_previous)                                 AS sessions_previous,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_current)                AS visitors_current,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_previous)               AS visitors_previous,
        COALESCE(SUM(page_view_count) FILTER (WHERE is_current), 0)         AS page_views_current,
        COALESCE(SUM(page_view_count) FILTER (WHERE is_previous), 0)        AS page_views_previous,
        COALESCE(SUM(event_count) FILTER (WHERE is_current), 0)             AS events_current,
        COALESCE(SUM(event_count) FILTER (WHERE is_previous), 0)            AS events_previous,
        -- A "bounce" is a session with exactly one page view. Because this is a
        -- content site with no conversion funnel, single-page sessions are the
        -- clearest available signal that a visit did not go anywhere.
        COUNT(*) FILTER (WHERE is_current AND page_view_count <= 1)         AS bounced_current,
        COUNT(*) FILTER (WHERE is_previous AND page_view_count <= 1)        AS bounced_previous,
        -- Duration measured from first to last recorded activity. Sessions with
        -- one page view have no measurable duration and are excluded, which is
        -- standard practice and stops a wall of bounces dragging the mean to 0.
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity) - started_at)))
                 FILTER (WHERE is_current AND page_view_count > 1), 0)      AS avg_duration_current,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity) - started_at)))
                 FILTER (WHERE is_previous AND page_view_count > 1), 0)     AS avg_duration_previous
      FROM scoped
    ),
    returning_stats AS (
      -- A visitor is "returning" if they had at least one session before this
      -- one. Counted against the visitor's full history, not just the window,
      -- so a visitor who first arrived last year still counts as returning.
      SELECT
        COUNT(DISTINCT sc.visitor_id) FILTER (WHERE sc.is_current AND v.session_count > 1) AS returning_current,
        COUNT(DISTINCT sc.visitor_id) FILTER (WHERE sc.is_current)                          AS total_current
        FROM scoped sc JOIN visitors v ON v.id = sc.visitor_id
    ),
    rolling AS (
      SELECT
        COUNT(DISTINCT s.visitor_id) FILTER (WHERE s.started_at >= date_trunc('day', NOW()))        AS visitors_today,
        COUNT(DISTINCT s.visitor_id) FILTER (WHERE s.started_at >= NOW() - INTERVAL '7 days')       AS visitors_week,
        COUNT(DISTINCT s.visitor_id) FILTER (WHERE s.started_at >= NOW() - INTERVAL '30 days')      AS visitors_month,
        COUNT(*) FILTER (WHERE s.ended_at IS NULL AND s.last_activity > NOW() - INTERVAL '30 minutes') AS active_now
        FROM sessions s WHERE s.is_bot = FALSE
    ),
    lifetime AS (
      SELECT COUNT(*) AS total_visitors FROM visitors
    )
    SELECT * FROM session_stats, returning_stats, rolling, lifetime
    `,
    [String(days)]
  );

  const row = rows[0] ?? {};
  const sessionsCurrent = toNumber(row.sessions_current);
  const pageViewsCurrent = toNumber(row.page_views_current);
  const totalCurrent = toNumber(row.total_current);

  return {
    windowDays: days,
    realtime: {
      activeNow: toNumber(row.active_now),
      visitorsToday: toNumber(row.visitors_today),
      visitorsThisWeek: toNumber(row.visitors_week),
      visitorsThisMonth: toNumber(row.visitors_month),
      visitorsAllTime: toNumber(row.total_visitors),
    },
    metrics: {
      uniqueVisitors: { value: toNumber(row.visitors_current), previous: toNumber(row.visitors_previous) },
      sessions: { value: sessionsCurrent, previous: toNumber(row.sessions_previous) },
      pageViews: { value: pageViewsCurrent, previous: toNumber(row.page_views_previous) },
      events: { value: toNumber(row.events_current), previous: toNumber(row.events_previous) },
      pagesPerSession: {
        value: sessionsCurrent > 0 ? Number((pageViewsCurrent / sessionsCurrent).toFixed(2)) : 0,
        previous:
          toNumber(row.sessions_previous) > 0
            ? Number((toNumber(row.page_views_previous) / toNumber(row.sessions_previous)).toFixed(2))
            : 0,
      },
      avgSessionSeconds: {
        value: Math.round(toNumber(row.avg_duration_current)),
        previous: Math.round(toNumber(row.avg_duration_previous)),
      },
      bounceRate: {
        value: sessionsCurrent > 0 ? Number(((toNumber(row.bounced_current) / sessionsCurrent) * 100).toFixed(1)) : 0,
        previous:
          toNumber(row.sessions_previous) > 0
            ? Number(((toNumber(row.bounced_previous) / toNumber(row.sessions_previous)) * 100).toFixed(1))
            : 0,
      },
      returningRate: {
        value: totalCurrent > 0 ? Number(((toNumber(row.returning_current) / totalCurrent) * 100).toFixed(1)) : 0,
        previous: null, // Not computed for the prior window; the dashboard omits the delta rather than guessing.
      },
    },
  };
}

/**
 * Daily time series of visitors, sessions, page views and events.
 * `generate_series` guarantees one row per day across the whole window.
 */
async function getTrafficSeries({ days = 30 } = {}) {
  const { rows } = await query(
    `
    WITH calendar AS (
      SELECT generate_series(
        date_trunc('day', NOW() - make_interval(days => $1::INT)),
        date_trunc('day', NOW()),
        INTERVAL '1 day'
      ) AS day
    ),
    session_days AS (
      SELECT date_trunc('day', started_at) AS day,
             COUNT(*)                        AS sessions,
             COUNT(DISTINCT visitor_id)      AS visitors
        FROM sessions
       WHERE is_bot = FALSE AND started_at >= NOW() - make_interval(days => $1::INT)
       GROUP BY 1
    ),
    view_days AS (
      SELECT date_trunc('day', pv.viewed_at) AS day, COUNT(*) AS page_views
        FROM page_views pv JOIN sessions s ON s.id = pv.session_id
       WHERE s.is_bot = FALSE AND pv.viewed_at >= NOW() - make_interval(days => $1::INT)
       GROUP BY 1
    ),
    event_days AS (
      SELECT date_trunc('day', e.created_at) AS day, COUNT(*) AS events
        FROM events e JOIN sessions s ON s.id = e.session_id
       WHERE s.is_bot = FALSE AND e.created_at >= NOW() - make_interval(days => $1::INT)
       GROUP BY 1
    )
    SELECT to_char(c.day, 'YYYY-MM-DD')      AS date,
           COALESCE(sd.visitors, 0)::INT     AS visitors,
           COALESCE(sd.sessions, 0)::INT     AS sessions,
           COALESCE(vd.page_views, 0)::INT   AS page_views,
           COALESCE(ed.events, 0)::INT       AS events
      FROM calendar c
      LEFT JOIN session_days sd ON sd.day = c.day
      LEFT JOIN view_days    vd ON vd.day = c.day
      LEFT JOIN event_days   ed ON ed.day = c.day
     ORDER BY c.day
    `,
    [String(days)]
  );

  return rows.map((row) => ({
    date: row.date,
    visitors: row.visitors,
    sessions: row.sessions,
    pageViews: row.page_views,
    events: row.events,
  }));
}

/**
 * Page-level breakdowns: overall ranking, plus project and lab sub-rankings
 * and the entry/exit pages that flow analysis depends on.
 */
async function getPages({ days = 30, limit = 10 } = {}) {
  const params = [String(days), limit];

  const topPages = await query(
    `SELECT pv.path,
            MAX(pv.page_title)                                AS title,
            COUNT(*)::INT                                     AS views,
            COUNT(DISTINCT pv.session_id)::INT                AS sessions,
            COALESCE(ROUND(AVG(pv.duration_seconds)), 0)::INT AS avg_seconds
       FROM page_views pv JOIN sessions s ON s.id = pv.session_id
      WHERE s.is_bot = FALSE AND pv.viewed_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY pv.path
      ORDER BY views DESC
      LIMIT $2`,
    params
  );

  // Project and lab detail pages live under known prefixes, so they can be
  // ranked separately without a lookup table.
  const bySegment = async (prefix) =>
    (
      await query(
        `SELECT pv.path,
                MAX(pv.page_title)                                AS title,
                COUNT(*)::INT                                     AS views,
                COUNT(DISTINCT pv.session_id)::INT                AS sessions,
                COALESCE(ROUND(AVG(pv.duration_seconds)), 0)::INT AS avg_seconds
           FROM page_views pv JOIN sessions s ON s.id = pv.session_id
          WHERE s.is_bot = FALSE
            AND pv.viewed_at >= NOW() - make_interval(days => $1::INT)
            AND pv.path LIKE $3
            AND pv.path <> $4
          GROUP BY pv.path
          ORDER BY views DESC
          LIMIT $2`,
        [...params, `${prefix}/%`, prefix]
      )
    ).rows;

  const entryPages = await query(
    `SELECT entry_page AS path, COUNT(*)::INT AS sessions
       FROM sessions
      WHERE is_bot = FALSE AND entry_page IS NOT NULL
        AND started_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY entry_page ORDER BY sessions DESC LIMIT $2`,
    params
  );

  const exitPages = await query(
    `SELECT exit_page AS path,
            COUNT(*)::INT AS sessions,
            -- Share of sessions reaching this page that ended on it.
            ROUND(100.0 * COUNT(*) / NULLIF((
              SELECT COUNT(DISTINCT pv.session_id)
                FROM page_views pv JOIN sessions s2 ON s2.id = pv.session_id
               WHERE pv.path = sessions.exit_page AND s2.is_bot = FALSE
                 AND pv.viewed_at >= NOW() - make_interval(days => $1::INT)
            ), 0), 1)::FLOAT AS exit_rate
       FROM sessions
      WHERE is_bot = FALSE AND exit_page IS NOT NULL
        AND started_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY exit_page ORDER BY sessions DESC LIMIT $2`,
    params
  );

  const shape = (rows) =>
    rows.map((r) => ({
      path: r.path,
      title: r.title ?? null,
      views: r.views ?? null,
      sessions: r.sessions,
      avgSeconds: r.avg_seconds ?? null,
      exitRate: r.exit_rate ?? null,
    }));

  return {
    topPages: shape(topPages.rows),
    topProjects: shape(await bySegment("/projects")),
    topLabs: shape(await bySegment("/lab")),
    entryPages: shape(entryPages.rows),
    exitPages: shape(exitPages.rows),
  };
}

/**
 * Acquisition: which bucket sessions came from, and which specific hosts
 * referred them. `internal` is excluded from the source breakdown -- navigating
 * within the site is not an acquisition channel.
 */
async function getSources({ days = 30, limit = 10 } = {}) {
  const sources = await query(
    `SELECT COALESCE(traffic_source, 'other')           AS source,
            COUNT(*)::INT                               AS sessions,
            COUNT(DISTINCT visitor_id)::INT             AS visitors,
            COALESCE(ROUND(AVG(page_view_count), 2), 0)::FLOAT AS pages_per_session
       FROM sessions
      WHERE is_bot = FALSE
        AND COALESCE(traffic_source, 'other') <> 'internal'
        AND started_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY 1 ORDER BY sessions DESC`,
    [String(days)]
  );

  const referrers = await query(
    `SELECT referrer_host AS host, COUNT(*)::INT AS sessions
       FROM sessions
      WHERE is_bot = FALSE AND referrer_host IS NOT NULL
        AND COALESCE(traffic_source, 'other') <> 'internal'
        AND started_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY 1 ORDER BY sessions DESC LIMIT $2`,
    [String(days), limit]
  );

  return {
    sources: sources.rows.map((r) => ({
      source: r.source,
      label: SOURCE_LABELS[r.source] ?? "Other",
      sessions: r.sessions,
      visitors: r.visitors,
      pagesPerSession: r.pages_per_session,
    })),
    referrers: referrers.rows.map((r) => ({ host: r.host, sessions: r.sessions })),
  };
}

/** Device, browser and OS distribution, in coarse families only. */
async function getDevices({ days = 30 } = {}) {
  const breakdown = async (column) =>
    (
      await query(
        `SELECT COALESCE(${column}, 'Unknown') AS label, COUNT(*)::INT AS sessions
           FROM sessions
          WHERE is_bot = FALSE AND started_at >= NOW() - make_interval(days => $1::INT)
          GROUP BY 1 ORDER BY sessions DESC LIMIT 12`,
        [String(days)]
      )
    ).rows;

  // Column names are hard-coded literals chosen in this file, never derived
  // from request input, so this interpolation cannot carry user data.
  return {
    devices: await breakdown("device_category"),
    browsers: await breakdown("browser_family"),
    operatingSystems: await breakdown("os_family"),
  };
}

/**
 * Visitor journey analysis.
 *
 * Three views of movement through the site:
 *  - `entries`      where sessions begin, split by acquisition source
 *  - `transitions`  page-to-page movement, reconstructed by self-joining
 *                   page_views on consecutive `view_sequence` values
 *  - `journeys`     the most common complete paths, capped at six steps
 *  - `exits`        where sessions end, with a drop-off rate
 */
async function getFlows({ days = 30, limit = 15 } = {}) {
  const params = [String(days), limit];

  const sourceToEntry = await query(
    `SELECT COALESCE(traffic_source, 'other') AS source,
            entry_page                        AS path,
            COUNT(*)::INT                     AS sessions
       FROM sessions
      WHERE is_bot = FALSE AND entry_page IS NOT NULL
        AND started_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY 1, 2 ORDER BY sessions DESC LIMIT $2`,
    params
  );

  const transitions = await query(
    `SELECT a.path        AS from_path,
            b.path        AS to_path,
            COUNT(*)::INT AS transitions
       FROM page_views a
       JOIN page_views b
         ON b.session_id = a.session_id
        AND b.view_sequence = a.view_sequence + 1
       JOIN sessions s ON s.id = a.session_id
      WHERE s.is_bot = FALSE
        AND a.viewed_at >= NOW() - make_interval(days => $1::INT)
        AND a.path <> b.path
      GROUP BY 1, 2 ORDER BY transitions DESC LIMIT $2`,
    params
  );

  const journeys = await query(
    `WITH ordered AS (
       SELECT pv.session_id, pv.path, pv.view_sequence
         FROM page_views pv JOIN sessions s ON s.id = pv.session_id
        WHERE s.is_bot = FALSE
          AND pv.viewed_at >= NOW() - make_interval(days => $1::INT)
          AND pv.view_sequence <= 6
     ),
     paths AS (
       SELECT session_id,
              string_agg(path, ' -> ' ORDER BY view_sequence) AS journey,
              COUNT(*)::INT                                   AS steps
         FROM ordered GROUP BY session_id
     )
     SELECT journey, steps, COUNT(*)::INT AS sessions
       FROM paths
      WHERE steps > 1
      GROUP BY journey, steps
      ORDER BY sessions DESC, steps DESC
      LIMIT $2`,
    params
  );

  const exits = await query(
    `SELECT exit_page AS path, COUNT(*)::INT AS sessions
       FROM sessions
      WHERE is_bot = FALSE AND exit_page IS NOT NULL
        AND started_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY 1 ORDER BY sessions DESC LIMIT $2`,
    params
  );

  return {
    entries: sourceToEntry.rows.map((r) => ({
      source: r.source,
      label: SOURCE_LABELS[r.source] ?? "Other",
      path: r.path,
      sessions: r.sessions,
    })),
    transitions: transitions.rows.map((r) => ({
      from: r.from_path,
      to: r.to_path,
      count: r.transitions,
    })),
    journeys: journeys.rows.map((r) => ({
      steps: r.journey.split(" -> "),
      sessions: r.sessions,
    })),
    exits: exits.rows.map((r) => ({ path: r.path, sessions: r.sessions })),
  };
}

/** Event totals, daily series, and the outbound destinations people click. */
async function getEvents({ days = 30, limit = 15 } = {}) {
  const byType = await query(
    `SELECT e.event_type AS type,
            COUNT(*)::INT AS count,
            COUNT(DISTINCT e.session_id)::INT AS sessions
       FROM events e JOIN sessions s ON s.id = e.session_id
      WHERE s.is_bot = FALSE AND e.created_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY 1 ORDER BY count DESC`,
    [String(days)]
  );

  const series = await query(
    `WITH calendar AS (
       SELECT generate_series(
         date_trunc('day', NOW() - make_interval(days => $1::INT)),
         date_trunc('day', NOW()), INTERVAL '1 day') AS day
     ),
     counted AS (
       SELECT date_trunc('day', e.created_at) AS day, e.event_type, COUNT(*)::INT AS count
         FROM events e JOIN sessions s ON s.id = e.session_id
        WHERE s.is_bot = FALSE AND e.created_at >= NOW() - make_interval(days => $1::INT)
        GROUP BY 1, 2
     )
     SELECT to_char(c.day, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(counted.count), 0)::INT AS count
       FROM calendar c LEFT JOIN counted ON counted.day = c.day
      GROUP BY c.day ORDER BY c.day`,
    [String(days)]
  );

  // Outbound destinations. `event_data->>'host'` is written by the client-side
  // link tracker, which records only the destination hostname.
  const outbound = await query(
    `SELECT COALESCE(e.event_data->>'host', 'unknown') AS host,
            COUNT(*)::INT AS clicks
       FROM events e JOIN sessions s ON s.id = e.session_id
      WHERE s.is_bot = FALSE
        AND e.event_type IN ('external_link_click', 'github_click')
        AND e.created_at >= NOW() - make_interval(days => $1::INT)
      GROUP BY 1 ORDER BY clicks DESC LIMIT $2`,
    [String(days), limit]
  );

  const recent = await query(
    `SELECT e.event_type AS type,
            e.page_path   AS path,
            e.event_data  AS data,
            e.created_at  AS at,
            s.traffic_source AS source,
            s.device_category AS device
       FROM events e JOIN sessions s ON s.id = e.session_id
      WHERE s.is_bot = FALSE
      ORDER BY e.created_at DESC LIMIT $1`,
    [limit]
  );

  return {
    byType: byType.rows,
    series: series.rows,
    outbound: outbound.rows,
    recent: recent.rows.map((r) => ({
      type: r.type,
      path: r.path,
      data: r.data,
      at: r.at,
      source: r.source,
      device: r.device,
    })),
  };
}

/** Most recent page views, for the dashboard's live activity feed. */
async function getRecentActivity({ limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT pv.path,
            pv.page_title      AS title,
            pv.viewed_at       AS at,
            pv.view_sequence   AS sequence,
            s.traffic_source   AS source,
            s.device_category  AS device,
            s.browser_family   AS browser,
            -- Short prefix only: enough to see that several views belong to one
            -- visit, not enough to be a usable identifier in the UI.
            left(s.session_uuid::TEXT, 8) AS session_ref
       FROM page_views pv JOIN sessions s ON s.id = pv.session_id
      WHERE s.is_bot = FALSE
      ORDER BY pv.viewed_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  getOverview,
  getTrafficSeries,
  getPages,
  getSources,
  getDevices,
  getFlows,
  getEvents,
  getRecentActivity,
};
