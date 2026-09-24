/**
 * Authentication and authorisation tests.
 *
 * These cover the controls that protect the analytics console: they are the
 * difference between a private dashboard and a public one.
 */

import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createApp } from "../src/app";
import { query, pool } from "../src/db/database";
import { upsertAdmin, checkPasswordPolicy } from "../src/services/authService";
import { resetDatabase, appRequire } from "./setup";

// Loaded via appRequire, not `import`: the running app holds the CommonJS
// instance of this module, and resetting any other copy would do nothing.
// See the comment on appRequire in setup.js.
const { resetLimitersForTests } = appRequire("../src/middleware/rateLimit.js");

const app = createApp();

const USERNAME = "sahil";
const PASSWORD = "correct-horse-battery-staple-2026";

async function createAdmin() {
  await upsertAdmin({ username: USERNAME, password: PASSWORD });
}

/** Sign in and return an agent carrying the session, plus its CSRF token. */
async function signIn() {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/admin/auth/login")
    .send({ username: USERNAME, password: PASSWORD })
    .expect(200);
  return { agent, csrfToken: response.body.csrfToken };
}

beforeEach(async () => {
  await resetDatabase();
  // Cases below deliberately exhaust the login limiter; without a reset the
  // first one would 429 every test that follows it.
  resetLimitersForTests();
  await createAdmin();
});

afterAll(() => pool.end());

describe("password policy", () => {
  it("requires length over composition rules", () => {
    expect(checkPasswordPolicy("short")).toMatch(/at least 12/);
    expect(checkPasswordPolicy("a-perfectly-fine-long-passphrase")).toBeNull();
  });

  it("rejects well-known weak phrases", () => {
    expect(checkPasswordPolicy("password12345")).toMatch(/weak phrase/);
    expect(checkPasswordPolicy("aaaaaaaaaaaaaaa")).toMatch(/repeated character/);
  });
});

describe("credential storage", () => {
  it("stores only a bcrypt hash, never the password", async () => {
    const { rows } = await query("SELECT password_hash FROM admin_users WHERE username = $1", [USERNAME]);
    const hash = rows[0].password_hash;

    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format with cost factor
    expect(hash).not.toContain(PASSWORD);
  });

  it("produces a different hash for the same password, because of the salt", async () => {
    const first = (await query("SELECT password_hash FROM admin_users")).rows[0].password_hash;
    await upsertAdmin({ username: "another-admin", password: PASSWORD });
    const second = (
      await query("SELECT password_hash FROM admin_users WHERE username = 'another-admin'")
    ).rows[0].password_hash;

    expect(first).not.toBe(second);
  });
});

describe("login", () => {
  it("accepts correct credentials and returns a CSRF token", async () => {
    const response = await request(app)
      .post("/api/admin/auth/login")
      .send({ username: USERNAME, password: PASSWORD })
      .expect(200);

    expect(response.body.authenticated).toBe(true);
    expect(response.body.user.username).toBe(USERNAME);
    expect(response.body.csrfToken).toBeTruthy();
    // The password must never be echoed back in any form.
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
  });

  it("sets an HttpOnly, SameSite=Strict session cookie", async () => {
    const response = await request(app)
      .post("/api/admin/auth/login")
      .send({ username: USERNAME, password: PASSWORD })
      .expect(200);

    const cookie = (response.headers["set-cookie"] ?? []).find((c) =>
      c.startsWith("portfolio_admin_sid=")
    );
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    // Strict, unlike the analytics cookie: this one authorises access, so it
    // must never travel on a cross-site request at all.
    expect(cookie).toMatch(/SameSite=Strict/i);
    // The cookie name must not advertise the framework.
    expect(cookie).not.toMatch(/connect\.sid/);
  });

  it("gives an identical response for a wrong password and an unknown user", async () => {
    const wrongPassword = await request(app)
      .post("/api/admin/auth/login")
      .send({ username: USERNAME, password: "definitely-not-the-password" })
      .expect(401);

    const unknownUser = await request(app)
      .post("/api/admin/auth/login")
      .send({ username: "no-such-person", password: "definitely-not-the-password" })
      .expect(401);

    // Identical status and body: no username enumeration through the response.
    expect(wrongPassword.body).toEqual(unknownUser.body);
    expect(wrongPassword.body.error.message).toBe("Invalid username or password.");
  });

  it("does not leak enumeration through response timing", async () => {
    // A missing user must still pay the bcrypt cost, or the timing difference
    // is itself an oracle. Measured as a ratio rather than an absolute, so the
    // test is not brittle on a slow machine.
    const time = async (username) => {
      const started = process.hrtime.bigint();
      await request(app).post("/api/admin/auth/login").send({ username, password: "wrong-password-here" });
      return Number(process.hrtime.bigint() - started) / 1e6;
    };

    const existing = [];
    const missing = [];
    for (let i = 0; i < 3; i += 1) {
      existing.push(await time(USERNAME));
      missing.push(await time("no-such-person"));
    }

    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const ratio = median(missing) / median(existing);

    // Without the dummy-hash comparison this ratio is close to zero, because
    // the missing-user path would return without hashing anything.
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  });

  it("regenerates the session id on login, preventing session fixation", async () => {
    const agent = request.agent(app);

    // Establish a pre-login session by touching an endpoint that sets one.
    await agent.get("/api/admin/auth/session").expect(200);
    const before = agent.jar.getCookie("portfolio_admin_sid", { path: "/", domain: "127.0.0.1", secure: false });

    const response = await agent
      .post("/api/admin/auth/login")
      .send({ username: USERNAME, password: PASSWORD })
      .expect(200);

    const issued = (response.headers["set-cookie"] ?? []).find((c) =>
      c.startsWith("portfolio_admin_sid=")
    );

    // A new session cookie must be issued at the moment privileges change.
    expect(issued).toBeDefined();
    if (before) {
      expect(issued).not.toContain(before.value);
    }
  });

  it("records the failure reason in the audit table but never in the response", async () => {
    await request(app)
      .post("/api/admin/auth/login")
      .send({ username: "no-such-person", password: "wrong" })
      .expect(401);

    const attempts = await query("SELECT * FROM admin_login_attempts ORDER BY id DESC LIMIT 1");
    expect(attempts.rows[0].successful).toBe(false);
    expect(attempts.rows[0].failure_reason).toBe("no_such_user");
    // The source address is stored as a keyed hash, not an address.
    expect(attempts.rows[0].ip_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(attempts.rows[0].ip_hash).not.toContain("127.0.0.1");
  });

  it("locks the account after repeated failures, independently of the IP limiter", async () => {
    // The per-IP limiter would stop this at attempt 9, so it is reset each time
    // to simulate the case the per-account lockout actually exists for: an
    // attacker spreading attempts across many source addresses, who therefore
    // never trips an IP-keyed limit.
    for (let i = 0; i < 10; i += 1) {
      resetLimitersForTests();
      await request(app)
        .post("/api/admin/auth/login")
        .send({ username: USERNAME, password: `wrong-attempt-${i}` });
    }
    resetLimitersForTests();

    const { rows } = await query("SELECT failed_attempts, locked_until FROM admin_users WHERE username = $1", [
      USERNAME,
    ]);
    expect(rows[0].failed_attempts).toBeGreaterThanOrEqual(10);
    expect(rows[0].locked_until).not.toBeNull();

    // Even the correct password is refused while locked.
    await request(app)
      .post("/api/admin/auth/login")
      .send({ username: USERNAME, password: PASSWORD })
      .expect(401);
  });

  it("resets the failure counter after a successful login", async () => {
    await request(app).post("/api/admin/auth/login").send({ username: USERNAME, password: "wrong" });
    await request(app).post("/api/admin/auth/login").send({ username: USERNAME, password: PASSWORD }).expect(200);

    const { rows } = await query("SELECT failed_attempts, last_login_at FROM admin_users WHERE username = $1", [
      USERNAME,
    ]);
    expect(rows[0].failed_attempts).toBe(0);
    expect(rows[0].last_login_at).not.toBeNull();
  });

  it("rejects malformed and oversized credentials", async () => {
    await request(app).post("/api/admin/auth/login").send({}).expect(400);
    await request(app).post("/api/admin/auth/login").send({ username: 123, password: [] }).expect(400);
    // Bounded before bcrypt, so a client cannot buy expensive CPU time. The
    // 2kb body-parser limit usually refuses this first with 413; the explicit
    // length check returns 400. Either is a correct refusal — what matters is
    // that an unbounded string never reaches the hashing function.
    const oversized = await request(app)
      .post("/api/admin/auth/login")
      .send({ username: USERNAME, password: "x".repeat(5000) });
    expect([400, 413]).toContain(oversized.status);
  });
});

describe("login rate limiting", () => {
  it("throttles repeated failures from one address", async () => {
    let sawRateLimit = false;
    for (let i = 0; i < 12; i += 1) {
      const response = await request(app)
        .post("/api/admin/auth/login")
        .send({ username: USERNAME, password: `wrong-${i}` });
      if (response.status === 429) {
        sawRateLimit = true;
        expect(response.body.error.code).toBe("rate_limited");
        break;
      }
    }
    expect(sawRateLimit).toBe(true);
  });

  it("does not count successful logins towards the limit", async () => {
    // A legitimate admin signing in repeatedly must never lock themselves out.
    for (let i = 0; i < 12; i += 1) {
      await request(app)
        .post("/api/admin/auth/login")
        .send({ username: USERNAME, password: PASSWORD })
        .expect(200);
    }
  });
});

describe("authorisation", () => {
  const PROTECTED = [
    "/api/admin/analytics/overview",
    "/api/admin/analytics/traffic",
    "/api/admin/analytics/pages",
    "/api/admin/analytics/sources",
    "/api/admin/analytics/devices",
    "/api/admin/analytics/flows",
    "/api/admin/analytics/events",
    "/api/admin/analytics/activity",
    "/api/admin/analytics/insights",
    "/api/admin/analytics/insights/snapshot",
  ];

  it("refuses every analytics endpoint without a session", async () => {
    for (const path of PROTECTED) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
      expect(response.body.error.code, path).toBe("unauthenticated");
    }
  });

  it("allows every analytics endpoint with a session", async () => {
    const { agent } = await signIn();
    for (const path of PROTECTED) {
      const response = await agent.get(path);
      expect(response.status, path).toBe(200);
    }
  });

  it("refuses a forged session cookie", async () => {
    await request(app)
      .get("/api/admin/analytics/overview")
      .set("Cookie", "portfolio_admin_sid=s%3Aforged-session-id.fake-signature")
      .expect(401);
  });

  it("stops serving data after logout", async () => {
    const { agent, csrfToken } = await signIn();
    await agent.get("/api/admin/analytics/overview").expect(200);
    await agent.post("/api/admin/auth/logout").set("X-CSRF-Token", csrfToken).expect(204);
    await agent.get("/api/admin/analytics/overview").expect(401);
  });

  it("destroys the session server-side on logout, not just the cookie", async () => {
    const { agent, csrfToken } = await signIn();
    const before = await query("SELECT COUNT(*)::INT AS count FROM session");
    expect(before.rows[0].count).toBeGreaterThan(0);

    await agent.post("/api/admin/auth/logout").set("X-CSRF-Token", csrfToken).expect(204);

    const after = await query("SELECT COUNT(*)::INT AS count FROM session");
    expect(after.rows[0].count).toBe(0);
  });
});

describe("CSRF protection", () => {
  it("refuses a state-changing request with no token", async () => {
    const { agent } = await signIn();
    const response = await agent.post("/api/admin/auth/logout").expect(403);
    expect(response.body.error.code).toBe("csrf_failed");
  });

  it("refuses a state-changing request with the wrong token", async () => {
    const { agent } = await signIn();
    await agent.post("/api/admin/auth/logout").set("X-CSRF-Token", "not-the-right-token").expect(403);
  });

  it("accepts the correct token", async () => {
    const { agent, csrfToken } = await signIn();
    await agent.post("/api/admin/auth/logout").set("X-CSRF-Token", csrfToken).expect(204);
  });

  it("does not require a token on safe methods", async () => {
    const { agent } = await signIn();
    await agent.get("/api/admin/analytics/overview").expect(200);
  });
});

describe("query parameter validation", () => {
  it("rejects out-of-range and non-numeric windows", async () => {
    const { agent } = await signIn();
    for (const query of ["days=0", "days=9999", "days=abc", "days='; DROP TABLE sessions; --", "limit=99999"]) {
      const response = await agent.get(`/api/admin/analytics/overview?${query}`);
      expect(response.status, query).toBe(400);
      expect(response.body.error.code, query).toBe("invalid_query");
    }
  });

  it("does not leak a database error code or SQL to the client", async () => {
    const { agent } = await signIn();
    const response = await agent.get("/api/admin/analytics/overview?days=abc");
    const body = JSON.stringify(response.body);

    // A PostgreSQL SQLSTATE such as 42883 or a SQL fragment reaching the client
    // is free reconnaissance.
    expect(body).not.toMatch(/\b\d{5}\b/);
    expect(body).not.toMatch(/SELECT|FROM|INTERVAL/i);
    expect(body).not.toContain("stack");
  });
});

describe("session endpoint", () => {
  it("reports anonymous state without leaking whether an account exists", async () => {
    const response = await request(app).get("/api/admin/auth/session").expect(200);
    expect(response.body.authenticated).toBe(false);
    // setupRequired is false because an admin exists; it is a boolean, never a
    // username or count.
    expect(response.body.setupRequired).toBe(false);
    expect(response.body.user).toBeUndefined();
  });

  it("reports setup required when no account has been created", async () => {
    await query("DELETE FROM admin_users");
    const response = await request(app).get("/api/admin/auth/session").expect(200);
    expect(response.body.setupRequired).toBe(true);
  });
});
