-- 004_admin_auth.sql
--
-- Administrator authentication and the server-side session store.
--
-- No credentials are seeded here. The single administrator account is created
-- out-of-band with `npm run admin:create`, which prompts for a password, hashes
-- it with bcrypt and never echoes it. A migration file is committed to version
-- control, so it is the wrong place for anything resembling a secret.

CREATE TABLE IF NOT EXISTS admin_users (
    id              BIGSERIAL PRIMARY KEY,
    username        TEXT        NOT NULL UNIQUE,
    -- bcrypt output, including its own per-user salt and cost factor.
    password_hash   TEXT        NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    -- Per-account throttle, layered underneath the per-IP rate limiter so that
    -- a distributed attempt against one username is still slowed down.
    failed_attempts INTEGER     NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    CONSTRAINT admin_users_username_length CHECK (length(username) BETWEEN 3 AND 64)
);

-- Security audit trail for authentication.
--
-- Deliberately does NOT store raw IP addresses. `ip_hash` is
-- SHA-256(ip + SESSION_SECRET), which is enough to recognise repeated attempts
-- from one source and to correlate a burst, but is not reversible to an address
-- by anyone who obtains only the database.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id           BIGSERIAL PRIMARY KEY,
    username     TEXT        NOT NULL,
    ip_hash      TEXT,
    successful   BOOLEAN     NOT NULL,
    -- Coarse failure reason for audit ('no_such_user', 'bad_password',
    -- 'locked', 'inactive'). Never surfaced to the client, which always
    -- receives one generic message.
    failure_reason TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created  ON admin_login_attempts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip       ON admin_login_attempts (ip_hash, created_at DESC);

-- Session store for connect-pg-simple. Sessions live in PostgreSQL rather than
-- in process memory so that a restart does not log the administrator out and so
-- that a session can be revoked server-side by deleting its row.
CREATE TABLE IF NOT EXISTS "session" (
    sid    VARCHAR      NOT NULL COLLATE "default",
    sess   JSON         NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
    ) THEN
        ALTER TABLE "session" ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire);
