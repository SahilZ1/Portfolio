-- 002_analytics_enrichment.sql
--
-- Extends the analytics core so that sessions can be attributed, flows can be
-- reconstructed, and bot traffic can be excluded from reported figures.
--
-- Privacy note on `sessions.user_agent`:
-- The baseline stored the raw User-Agent string. A full UA is a meaningful
-- component of a browser fingerprint, and we only ever need it to answer three
-- coarse questions: phone or desktop, which browser family, which OS family.
-- Those three answers are now derived at ingest time and the raw string is
-- discarded, so the fingerprinting surface never reaches storage. The column is
-- dropped rather than left dormant so it cannot quietly start being populated
-- again. (No rows existed at the time this migration was written.)

ALTER TABLE sessions DROP COLUMN IF EXISTS user_agent;

ALTER TABLE sessions
    -- Coarse buckets only: 'desktop' | 'mobile' | 'tablet' | 'unknown'.
    ADD COLUMN IF NOT EXISTS device_category  TEXT,
    -- Family names only ('Chrome', 'Safari'), never full version strings.
    ADD COLUMN IF NOT EXISTS browser_family   TEXT,
    ADD COLUMN IF NOT EXISTS os_family        TEXT,
    -- Normalised attribution bucket: direct | google | linkedin | github |
    -- search | referral | internal | other.
    ADD COLUMN IF NOT EXISTS traffic_source   TEXT,
    -- Hostname of the referrer, without path or query. The full referrer URL is
    -- kept in `referrer` only when it is external, and query strings are
    -- stripped at ingest so campaign tails never persist.
    ADD COLUMN IF NOT EXISTS referrer_host    TEXT,
    ADD COLUMN IF NOT EXISTS is_bot           BOOLEAN NOT NULL DEFAULT FALSE,
    -- Denormalised counters. Maintained on write so dashboard aggregates do not
    -- need a correlated COUNT over page_views for every session.
    ADD COLUMN IF NOT EXISTS page_view_count  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS event_count      INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sessions
    ADD CONSTRAINT sessions_device_category_check
    CHECK (device_category IS NULL OR device_category IN ('desktop', 'mobile', 'tablet', 'unknown'));

ALTER TABLE page_views
    -- 1-based position of this view within its session. Makes "what did they
    -- look at next" a self-join on sequence rather than a window function over
    -- timestamps, and makes the entry view trivially identifiable.
    ADD COLUMN IF NOT EXISTS view_sequence    INTEGER NOT NULL DEFAULT 1,
    -- Seconds spent on this page, filled in when the next view arrives. NULL on
    -- the final view of a session, which is exactly the "exit page" signal.
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE visitors
    -- Lets "returning visitor" be answered without aggregating sessions.
    ADD COLUMN IF NOT EXISTS session_count INTEGER NOT NULL DEFAULT 0;

-- Guard rails against oversized ingest payloads reaching storage. The API
-- validates and truncates first; these constraints are the backstop.
ALTER TABLE page_views ADD CONSTRAINT page_views_path_length_check CHECK (length(path) <= 512);
ALTER TABLE events     ADD CONSTRAINT events_page_path_length_check CHECK (page_path IS NULL OR length(page_path) <= 512);
