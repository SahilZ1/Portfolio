/**
 * Integration tests for the analytics ingest pipeline.
 *
 * Exercised through real HTTP against the real app and a real database, because
 * the behaviour under test — cookie issuance, session windowing, sequence
 * numbering, denormalised counters — is produced by the interaction of the
 * middleware, the service and the SQL, not by any one of them.
 */

import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createApp } from "../src/app";
import { query, pool } from "../src/db/database";
import { resetDatabase } from "./setup";

const app = createApp();

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

/** Extract the visitor cookie from a Set-Cookie header set. */
function visitorCookie(response) {
  const cookies = response.headers["set-cookie"] ?? [];
  const cookie = cookies.find((entry) => entry.startsWith("portfolio_visitor="));
  return cookie ? cookie.split(";")[0] : null;
}

beforeEach(resetDatabase);
afterAll(() => pool.end());

describe("visitor cookie", () => {
  it("issues an HttpOnly, SameSite=Lax cookie on first contact", async () => {
    const response = await request(app).get("/api/health");
    const raw = (response.headers["set-cookie"] ?? []).find((c) => c.startsWith("portfolio_visitor="));

    expect(raw).toBeDefined();
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);
    // Secure must be absent outside production, or local development breaks.
    expect(raw).not.toMatch(/Secure/i);
    expect(raw).toMatch(/Max-Age=31536000/);
  });

  it("issues a v4 UUID that is not derived from request characteristics", async () => {
    const first = visitorCookie(await request(app).get("/api/health").set("User-Agent", CHROME));
    const second = visitorCookie(await request(app).get("/api/health").set("User-Agent", CHROME));

    const value = (cookie) => cookie.split("=")[1];
    expect(value(first)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    // Identical requests must produce different identifiers — that is the
    // difference between a random id and a fingerprint.
    expect(value(first)).not.toBe(value(second));
  });

  it("does not touch the database on an ordinary request", async () => {
    await request(app).get("/api/health");
    const { rows } = await query("SELECT COUNT(*)::INT AS count FROM visitors");
    // The old implementation wrote a visitor row per request, including assets.
    expect(rows[0].count).toBe(0);
  });

  it("replaces a malformed cookie rather than passing it through to SQL", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Cookie", "portfolio_visitor=' OR 1=1--");

    const raw = (response.headers["set-cookie"] ?? []).find((c) => c.startsWith("portfolio_visitor="));
    expect(raw).toBeDefined();
    expect(raw).not.toContain("OR 1=1");
  });
});

describe("page view ingest", () => {
  it("creates the visitor, session and page view chain", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/track/pageview")
      .set("User-Agent", CHROME)
      .send({ path: "/", title: "Home", referrer: "https://www.linkedin.com/in/someone" })
      .expect(204);

    const visitors = await query("SELECT * FROM visitors");
    const sessions = await query("SELECT * FROM sessions");
    const views = await query("SELECT * FROM page_views");

    expect(visitors.rowCount).toBe(1);
    expect(sessions.rowCount).toBe(1);
    expect(views.rowCount).toBe(1);

    expect(sessions.rows[0]).toMatchObject({
      entry_page: "/",
      exit_page: "/",
      traffic_source: "linkedin",
      referrer_host: "linkedin.com",
      device_category: "desktop",
      browser_family: "Chrome",
      os_family: "Windows",
      is_bot: false,
      page_view_count: 1,
    });
    expect(views.rows[0].view_sequence).toBe(1);
  });

  it("never stores the raw User-Agent string", async () => {
    const agent = request.agent(app);
    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/" }).expect(204);

    const columns = await query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sessions'`
    );
    const names = columns.rows.map((row) => row.column_name);
    expect(names).not.toContain("user_agent");
  });

  it("keeps consecutive views in one session with increasing sequence numbers", async () => {
    const agent = request.agent(app);

    for (const path of ["/", "/projects", "/projects/threatscope"]) {
      await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path }).expect(204);
    }

    const sessions = await query("SELECT * FROM sessions");
    expect(sessions.rowCount).toBe(1);
    expect(sessions.rows[0].page_view_count).toBe(3);
    expect(sessions.rows[0].entry_page).toBe("/");
    expect(sessions.rows[0].exit_page).toBe("/projects/threatscope");

    const views = await query("SELECT path, view_sequence FROM page_views ORDER BY view_sequence");
    expect(views.rows.map((row) => row.view_sequence)).toEqual([1, 2, 3]);
    expect(views.rows.map((row) => row.path)).toEqual(["/", "/projects", "/projects/threatscope"]);
  });

  it("starts a new session but keeps the same visitor after the inactivity window", async () => {
    const agent = request.agent(app);
    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/" }).expect(204);

    // Age the session past the 30-minute window.
    await query("UPDATE sessions SET last_activity = NOW() - INTERVAL '45 minutes'");

    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/about" }).expect(204);

    const visitors = await query("SELECT * FROM visitors");
    const sessions = await query("SELECT * FROM sessions ORDER BY id");

    // This is the property that makes returning-visitor figures meaningful.
    expect(visitors.rowCount).toBe(1);
    expect(visitors.rows[0].session_count).toBe(2);
    expect(sessions.rowCount).toBe(2);
    // The stale session must be closed, not left dangling.
    expect(sessions.rows[0].ended_at).not.toBeNull();
    expect(sessions.rows[1].ended_at).toBeNull();
    expect(sessions.rows[1].entry_page).toBe("/about");
  });

  it("records dwell time on the previous view when the next one arrives", async () => {
    const agent = request.agent(app);
    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/" }).expect(204);
    await query("UPDATE page_views SET viewed_at = NOW() - INTERVAL '30 seconds'");
    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/about" }).expect(204);

    const views = await query("SELECT duration_seconds FROM page_views ORDER BY view_sequence");
    expect(views.rows[0].duration_seconds).toBeGreaterThanOrEqual(29);
    // The final view of a session has no duration — that is the exit signal.
    expect(views.rows[1].duration_seconds).toBeNull();
  });

  it("marks crawler traffic as bot so it can be excluded from figures", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/track/pageview")
      .set("User-Agent", "Googlebot/2.1 (+http://www.google.com/bot.html)")
      .send({ path: "/" })
      .expect(204);

    const sessions = await query("SELECT is_bot FROM sessions");
    expect(sessions.rows[0].is_bot).toBe(true);
  });

  it("rejects hostile payloads without creating rows", async () => {
    const agent = request.agent(app);

    for (const body of [
      { path: "https://evil.example" },
      { path: "//evil.example" },
      { path: "" },
      { path: 12345 },
      {},
    ]) {
      await agent.post("/api/track/pageview").set("User-Agent", CHROME).send(body).expect(400);
    }

    const views = await query("SELECT COUNT(*)::INT AS count FROM page_views");
    expect(views.rows[0].count).toBe(0);
  });

  it("stores an injection-shaped path as an inert literal", async () => {
    const agent = request.agent(app);
    const hostile = "/x'; DROP TABLE sessions; --";

    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: hostile }).expect(204);

    // The table must still exist, and the value stored verbatim.
    const views = await query("SELECT path FROM page_views");
    expect(views.rows[0].path).toBe(hostile);
    const sessions = await query("SELECT COUNT(*)::INT AS count FROM sessions");
    expect(sessions.rows[0].count).toBe(1);
  });

  it("refuses an oversized body", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/track/pageview")
      .set("User-Agent", CHROME)
      .send({ path: "/", title: "x".repeat(50_000) })
      .expect((response) => {
        expect([400, 413]).toContain(response.status);
      });
  });
});

describe("event ingest", () => {
  it("records an event against the visitor's live session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/projects" }).expect(204);
    await agent
      .post("/api/track/event")
      .set("User-Agent", CHROME)
      .send({ type: "github_click", path: "/projects", data: { host: "github.com" } })
      .expect(204);

    const events = await query("SELECT * FROM events");
    expect(events.rowCount).toBe(1);
    expect(events.rows[0]).toMatchObject({ event_type: "github_click", page_path: "/projects" });
    expect(events.rows[0].event_data).toEqual({ host: "github.com" });

    const sessions = await query("SELECT event_count FROM sessions");
    expect(sessions.rows[0].event_count).toBe(1);
  });

  it("drops an event with no live session rather than inventing one", async () => {
    await request(app)
      .post("/api/track/event")
      .set("User-Agent", CHROME)
      .set("Cookie", "portfolio_visitor=11111111-1111-4111-8111-111111111111")
      .send({ type: "cta_click" })
      .expect(204);

    const events = await query("SELECT COUNT(*)::INT AS count FROM events");
    const sessions = await query("SELECT COUNT(*)::INT AS count FROM sessions");
    expect(events.rows[0].count).toBe(0);
    expect(sessions.rows[0].count).toBe(0);
  });

  it("rejects an unknown event type", async () => {
    const agent = request.agent(app);
    await agent.post("/api/track/pageview").set("User-Agent", CHROME).send({ path: "/" });
    await agent.post("/api/track/event").set("User-Agent", CHROME).send({ type: "anything" }).expect(400);
  });
});

describe("opt out", () => {
  it("clears an existing visitor cookie", async () => {
    const response = await request(app)
      .post("/api/track/opt-out")
      .set("Cookie", "portfolio_visitor=11111111-1111-4111-8111-111111111111")
      .expect(204);

    const cookies = (response.headers["set-cookie"] ?? []).filter((c) =>
      c.startsWith("portfolio_visitor=")
    );
    expect(cookies).toHaveLength(1);
    // An expiry in the past is how a cookie is deleted.
    expect(cookies[0]).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
  });

  it("does not issue a new identifier to a visitor who has none", async () => {
    const response = await request(app).post("/api/track/opt-out").expect(204);

    const issued = (response.headers["set-cookie"] ?? []).filter(
      (c) => c.startsWith("portfolio_visitor=") && !/Expires=Thu, 01 Jan 1970|Max-Age=0/i.test(c)
    );
    // Handing a tracking cookie to someone in the act of opting out would be
    // the wrong thing to put on the wire, even though it is deleted moments later.
    expect(issued).toHaveLength(0);
  });
});

describe("health endpoint contract", () => {
  it("preserves the original response shape", async () => {
    const response = await request(app).get("/api/health").expect(200);
    // These three fields are the pre-existing contract and must not change.
    expect(response.body.status).toBe("online");
    expect(response.body.service).toBe("Portfolio Analytics API");
    expect(response.body.database).toBe("connected");
  });
});
