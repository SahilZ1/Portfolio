-- 003_analytics_indexes.sql
--
-- The baseline had no indexes beyond primary keys and unique constraints, which
-- meant every dashboard query was a sequential scan. Each index below exists to
-- serve a specific query the admin dashboard actually runs.

-- Visitor lookup by cookie value happens on every single request that carries a
-- portfolio_visitor cookie. This is the hottest lookup in the system.
-- (visitor_uuid already has a UNIQUE index from the baseline.)
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen  ON visitors (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_first_seen ON visitors (first_seen DESC);

-- "Find this visitor's most recent session and decide whether it is still live"
-- runs once per tracked navigation.
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_activity ON sessions (visitor_id, last_activity DESC);
-- Time-bucketed dashboard queries. Partial on is_bot because every reported
-- figure excludes bots, so the index only needs to cover human traffic.
CREATE INDEX IF NOT EXISTS idx_sessions_started_at_human ON sessions (started_at DESC) WHERE is_bot = FALSE;
CREATE INDEX IF NOT EXISTS idx_sessions_traffic_source   ON sessions (traffic_source) WHERE is_bot = FALSE;
CREATE INDEX IF NOT EXISTS idx_sessions_entry_page       ON sessions (entry_page)     WHERE is_bot = FALSE;
CREATE INDEX IF NOT EXISTS idx_sessions_exit_page        ON sessions (exit_page)      WHERE is_bot = FALSE;

-- Page-view time series, top-pages ranking, and per-session flow reconstruction.
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at        ON page_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path_viewed_at   ON page_views (path, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_sequence ON page_views (session_id, view_sequence);

-- Event time series and per-type breakdowns.
CREATE INDEX IF NOT EXISTS idx_events_created_at      ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_created_at ON events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session         ON events (session_id, created_at);
-- Supports containment queries against structured event metadata, e.g. finding
-- every outbound click whose destination host was github.com.
CREATE INDEX IF NOT EXISTS idx_events_data_gin        ON events USING GIN (event_data);
