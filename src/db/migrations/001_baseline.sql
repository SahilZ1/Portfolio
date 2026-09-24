-- 001_baseline.sql
--
-- Declares the schema that already existed in the database when the migration
-- system was introduced. Every statement is IF NOT EXISTS, so on the original
-- development database this migration is a no-op that records the baseline
-- without touching existing rows; on a fresh database it creates the analytics
-- core from scratch.
--
-- Core model:  visitors 1--* sessions 1--* page_views
--                                     1--* events

CREATE TABLE IF NOT EXISTS visitors (
    id            BIGSERIAL PRIMARY KEY,
    -- Opaque, randomly generated identifier stored in the portfolio_visitor
    -- cookie. It is derived from crypto.randomUUID() and carries no information
    -- about the person holding it.
    visitor_uuid  UUID        NOT NULL UNIQUE,
    first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id            BIGSERIAL PRIMARY KEY,
    session_uuid  UUID        NOT NULL UNIQUE,
    visitor_id    BIGINT      NOT NULL REFERENCES visitors (id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMPTZ,
    entry_page    TEXT,
    exit_page     TEXT,
    referrer      TEXT,
    user_agent    TEXT
);

CREATE TABLE IF NOT EXISTS page_views (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT      NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    path        TEXT        NOT NULL,
    page_title  TEXT,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT       NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    event_type  VARCHAR(64)  NOT NULL,
    page_path   TEXT,
    event_data  JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
