-- 005_ai_insight_cache.sql
--
-- Cache for AI-generated analytics commentary.
--
-- Insights are expensive and slow relative to a dashboard load, and the
-- underlying numbers only move as fast as traffic arrives. Caching on a digest
-- of the aggregated input means an identical set of statistics is never sent to
-- a model twice, which bounds both cost and the amount of data that leaves the
-- server.
--
-- `input_digest` is a hash of the exact aggregate payload that was sent. It is
-- also an auditable record that only aggregates — never raw rows — were shared.

CREATE TABLE IF NOT EXISTS ai_insight_cache (
    id           BIGSERIAL PRIMARY KEY,
    -- Identifies the window the insights describe, e.g. 'overview:30d'.
    period_key   TEXT        NOT NULL,
    input_digest TEXT        NOT NULL,
    provider     TEXT        NOT NULL,
    model        TEXT        NOT NULL,
    -- { insights: [{ title, body, confidence, metrics: [...] }], ... }
    payload      JSONB       NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_insight_cache_key
    ON ai_insight_cache (period_key, input_digest);
CREATE INDEX IF NOT EXISTS idx_ai_insight_cache_expiry
    ON ai_insight_cache (expires_at);
