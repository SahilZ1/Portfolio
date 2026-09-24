/**
 * Analytics aggregation tests.
 *
 * These are the tests that matter most for credibility: a dashboard that
 * reports confident but wrong numbers is worse than no dashboard. Each case
 * seeds a known dataset and asserts the exact figure that should come back.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { query, pool } from "../src/db/database";
import * as analytics from "../src/services/analyticsService";
import { resetDatabase } from "./setup";

afterAll(() => pool.end());

/**
 * Seed a session with its page views directly, bypassing the ingest API so a
 * test can control timestamps and bot flags precisely.
 */
async function seedSession({
  visitorUuid,
  startedMinutesAgo = 10,
  durationMinutes = 0,
  entryPage = "/",
  paths = ["/"],
  source = "direct",
  referrerHost = null,
  device = "desktop",
  browser = "Chrome",
  os = "Windows",
  isBot = false,
  events = [],
}) {
  const visitor = await query(
    `INSERT INTO visitors (visitor_uuid, first_seen, last_seen, session_count)
     VALUES ($1, NOW() - make_interval(mins => $2::INT), NOW(), 1)
     ON CONFLICT (visitor_uuid)
     DO UPDATE SET last_seen = NOW(), session_count = visitors.session_count + 1
     RETURNING id`,
    [visitorUuid, startedMinutesAgo]
  );
  const visitorId = visitor.rows[0].id;

  const session = await query(
    `INSERT INTO sessions (
        session_uuid, visitor_id, started_at, last_activity, ended_at,
        entry_page, exit_page, referrer_host, traffic_source,
        device_category, browser_family, os_family, is_bot, page_view_count, event_count
     )
     VALUES (
        gen_random_uuid(), $1,
        NOW() - make_interval(mins => $2::INT),
        NOW() - make_interval(mins => $2::INT - $3::INT),
        NOW() - make_interval(mins => $2::INT - $3::INT),
        $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
     )
     RETURNING id`,
    [
      visitorId, startedMinutesAgo, durationMinutes,
      entryPage, paths.at(-1), referrerHost, source,
      device, browser, os, isBot, paths.length, events.length,
    ]
  );
  const sessionId = session.rows[0].id;

  for (const [index, path] of paths.entries()) {
    await query(
      `INSERT INTO page_views (session_id, path, page_title, view_sequence, viewed_at, duration_seconds)
       VALUES ($1, $2, $3, $4, NOW() - make_interval(mins => $5::INT), $6)`,
      [sessionId, path, `Title ${path}`, index + 1, startedMinutesAgo, index < paths.length - 1 ? 30 : null]
    );
  }

  for (const event of events) {
    await query(
      `INSERT INTO events (session_id, event_type, page_path, event_data, created_at)
       VALUES ($1, $2, $3, $4, NOW() - make_interval(mins => $5::INT))`,
      [sessionId, event.type, event.path ?? null, event.data ? JSON.stringify(event.data) : null, startedMinutesAgo]
    );
  }

  return { visitorId, sessionId };
}

beforeEach(resetDatabase);

describe("overview", () => {
  it("returns zeros on an empty database rather than nulls or NaN", async () => {
    const overview = await analytics.getOverview({ days: 30 });

    expect(overview.metrics.sessions.value).toBe(0);
    expect(overview.metrics.pagesPerSession.value).toBe(0);
    expect(overview.metrics.bounceRate.value).toBe(0);
    expect(overview.metrics.avgSessionSeconds.value).toBe(0);
    expect(Number.isNaN(overview.metrics.pagesPerSession.value)).toBe(false);
  });

  it("counts visitors, sessions and page views correctly", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", paths: ["/", "/projects"] });
    await seedSession({ visitorUuid: "22222222-2222-4222-8222-222222222222", paths: ["/"] });
    await seedSession({ visitorUuid: "33333333-3333-4333-8333-333333333333", paths: ["/", "/lab", "/contact"] });

    const overview = await analytics.getOverview({ days: 30 });

    expect(overview.metrics.uniqueVisitors.value).toBe(3);
    expect(overview.metrics.sessions.value).toBe(3);
    expect(overview.metrics.pageViews.value).toBe(6); // 2 + 1 + 3
    expect(overview.metrics.pagesPerSession.value).toBe(2); // 6 / 3
  });

  it("excludes bot traffic from every reported figure", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", paths: ["/"] });
    await seedSession({
      visitorUuid: "99999999-9999-4999-8999-999999999999",
      paths: ["/", "/projects", "/lab"],
      isBot: true,
    });

    const overview = await analytics.getOverview({ days: 30 });

    // A figure that silently mixes crawlers into "visitors" is a decoration.
    expect(overview.metrics.sessions.value).toBe(1);
    expect(overview.metrics.uniqueVisitors.value).toBe(1);
    expect(overview.metrics.pageViews.value).toBe(1);
  });

  it("computes bounce rate as the share of single-page sessions", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", paths: ["/"] });
    await seedSession({ visitorUuid: "22222222-2222-4222-8222-222222222222", paths: ["/"] });
    await seedSession({ visitorUuid: "33333333-3333-4333-8333-333333333333", paths: ["/", "/about"] });
    await seedSession({ visitorUuid: "44444444-4444-4444-8444-444444444444", paths: ["/", "/about"] });

    const overview = await analytics.getOverview({ days: 30 });
    expect(overview.metrics.bounceRate.value).toBe(50);
  });

  it("measures average session duration excluding single-page sessions", async () => {
    // Two-page session lasting 10 minutes.
    await seedSession({
      visitorUuid: "11111111-1111-4111-8111-111111111111",
      paths: ["/", "/about"],
      startedMinutesAgo: 60,
      durationMinutes: 10,
    });
    // A bounce, which has no measurable duration and must not drag the mean down.
    await seedSession({
      visitorUuid: "22222222-2222-4222-8222-222222222222",
      paths: ["/"],
      startedMinutesAgo: 60,
      durationMinutes: 0,
    });

    const overview = await analytics.getOverview({ days: 30 });
    expect(overview.metrics.avgSessionSeconds.value).toBe(600);
  });

  it("compares against the immediately preceding window of the same length", async () => {
    // Current window (last 7 days).
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", startedMinutesAgo: 60 });
    await seedSession({ visitorUuid: "22222222-2222-4222-8222-222222222222", startedMinutesAgo: 120 });
    // Previous window (7-14 days ago): 60 * 24 * 10 minutes = 10 days ago.
    await seedSession({ visitorUuid: "33333333-3333-4333-8333-333333333333", startedMinutesAgo: 60 * 24 * 10 });

    const overview = await analytics.getOverview({ days: 7 });
    expect(overview.metrics.sessions.value).toBe(2);
    expect(overview.metrics.sessions.previous).toBe(1);
  });

  it("excludes sessions outside the requested window", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", startedMinutesAgo: 60 });
    await seedSession({ visitorUuid: "22222222-2222-4222-8222-222222222222", startedMinutesAgo: 60 * 24 * 100 });

    expect((await analytics.getOverview({ days: 7 })).metrics.sessions.value).toBe(1);
    expect((await analytics.getOverview({ days: 365 })).metrics.sessions.value).toBe(2);
  });
});

describe("traffic series", () => {
  it("returns one row per day with gaps filled as zero", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", startedMinutesAgo: 60 });

    const series = await analytics.getTrafficSeries({ days: 7 });

    // generate_series covers the whole window inclusive of both ends.
    expect(series).toHaveLength(8);
    // A day with no traffic must be a zero, not a missing point a chart would
    // interpolate straight through.
    expect(series.every((day) => typeof day.sessions === "number")).toBe(true);
    expect(series.reduce((sum, day) => sum + day.sessions, 0)).toBe(1);
    expect(series.filter((day) => day.sessions === 0).length).toBe(7);
  });

  it("returns dates in ascending order", async () => {
    const series = await analytics.getTrafficSeries({ days: 5 });
    const dates = series.map((day) => day.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe("pages", () => {
  beforeEach(async () => {
    await seedSession({
      visitorUuid: "11111111-1111-4111-8111-111111111111",
      paths: ["/", "/projects", "/projects/threatscope"],
    });
    await seedSession({
      visitorUuid: "22222222-2222-4222-8222-222222222222",
      paths: ["/", "/lab", "/lab/security-headers"],
    });
  });

  it("ranks pages by view count", async () => {
    const pages = await analytics.getPages({ days: 30, limit: 10 });
    expect(pages.topPages[0].path).toBe("/");
    expect(pages.topPages[0].views).toBe(2);
  });

  it("separates project and lab detail pages from the overall ranking", async () => {
    const pages = await analytics.getPages({ days: 30, limit: 10 });

    // Index pages are excluded from their own sub-ranking.
    expect(pages.topProjects.map((p) => p.path)).toEqual(["/projects/threatscope"]);
    expect(pages.topLabs.map((p) => p.path)).toEqual(["/lab/security-headers"]);
  });

  it("identifies entry and exit pages", async () => {
    const pages = await analytics.getPages({ days: 30, limit: 10 });

    expect(pages.entryPages[0]).toMatchObject({ path: "/", sessions: 2 });
    const exits = pages.exitPages.map((p) => p.path);
    expect(exits).toContain("/projects/threatscope");
    expect(exits).toContain("/lab/security-headers");
  });
});

describe("traffic sources", () => {
  it("groups sessions by attribution bucket and excludes internal", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", source: "linkedin", referrerHost: "linkedin.com" });
    await seedSession({ visitorUuid: "22222222-2222-4222-8222-222222222222", source: "linkedin", referrerHost: "linkedin.com" });
    await seedSession({ visitorUuid: "33333333-3333-4333-8333-333333333333", source: "google", referrerHost: "google.com" });
    await seedSession({ visitorUuid: "44444444-4444-4444-8444-444444444444", source: "internal", referrerHost: "localhost" });

    const sources = await analytics.getSources({ days: 30, limit: 10 });
    const bySource = Object.fromEntries(sources.sources.map((s) => [s.source, s.sessions]));

    expect(bySource.linkedin).toBe(2);
    expect(bySource.google).toBe(1);
    // Navigating within the site is not an acquisition channel.
    expect(bySource.internal).toBeUndefined();
  });

  it("ranks referring hosts", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", source: "referral", referrerHost: "someblog.example" });
    const sources = await analytics.getSources({ days: 30, limit: 10 });
    expect(sources.referrers[0]).toMatchObject({ host: "someblog.example", sessions: 1 });
  });
});

describe("devices", () => {
  it("breaks sessions down by device, browser and OS family", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", device: "desktop", browser: "Chrome", os: "Windows" });
    await seedSession({ visitorUuid: "22222222-2222-4222-8222-222222222222", device: "mobile", browser: "Mobile Safari", os: "iOS" });
    await seedSession({ visitorUuid: "33333333-3333-4333-8333-333333333333", device: "mobile", browser: "Chrome", os: "Android" });

    const devices = await analytics.getDevices({ days: 30 });
    const byDevice = Object.fromEntries(devices.devices.map((d) => [d.label, d.sessions]));
    const byBrowser = Object.fromEntries(devices.browsers.map((d) => [d.label, d.sessions]));

    expect(byDevice.mobile).toBe(2);
    expect(byDevice.desktop).toBe(1);
    expect(byBrowser.Chrome).toBe(2);
  });
});

describe("flows", () => {
  it("reconstructs page-to-page transitions from view sequence", async () => {
    await seedSession({
      visitorUuid: "11111111-1111-4111-8111-111111111111",
      source: "linkedin",
      paths: ["/", "/projects", "/projects/threatscope"],
    });
    await seedSession({
      visitorUuid: "22222222-2222-4222-8222-222222222222",
      source: "linkedin",
      paths: ["/", "/projects"],
    });

    const flows = await analytics.getFlows({ days: 30, limit: 20 });

    const homeToProjects = flows.transitions.find((t) => t.from === "/" && t.to === "/projects");
    expect(homeToProjects.count).toBe(2);

    const projectsToDetail = flows.transitions.find(
      (t) => t.from === "/projects" && t.to === "/projects/threatscope"
    );
    expect(projectsToDetail.count).toBe(1);
  });

  it("attributes entry pages to their acquisition source", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", source: "linkedin", entryPage: "/", paths: ["/"] });

    const flows = await analytics.getFlows({ days: 30, limit: 20 });
    expect(flows.entries[0]).toMatchObject({ source: "linkedin", path: "/", sessions: 1 });
  });

  it("aggregates identical journeys", async () => {
    for (const uuid of [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]) {
      await seedSession({ visitorUuid: uuid, paths: ["/", "/projects"] });
    }

    const flows = await analytics.getFlows({ days: 30, limit: 20 });
    const journey = flows.journeys.find((j) => j.steps.join(">") === "/>/projects");
    expect(journey.sessions).toBe(2);
  });

  it("ignores single-page sessions when listing journeys", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", paths: ["/"] });
    const flows = await analytics.getFlows({ days: 30, limit: 20 });
    expect(flows.journeys).toHaveLength(0);
  });
});

describe("events", () => {
  it("counts events by type and extracts outbound destination hosts", async () => {
    await seedSession({
      visitorUuid: "11111111-1111-4111-8111-111111111111",
      paths: ["/projects"],
      events: [
        { type: "github_click", path: "/projects", data: { host: "github.com" } },
        { type: "github_click", path: "/projects", data: { host: "github.com" } },
        { type: "cta_click", path: "/projects", data: { cta: "contact" } },
      ],
    });

    const events = await analytics.getEvents({ days: 30, limit: 10 });
    const byType = Object.fromEntries(events.byType.map((e) => [e.type, e.count]));

    expect(byType.github_click).toBe(2);
    expect(byType.cta_click).toBe(1);
    expect(events.outbound[0]).toMatchObject({ host: "github.com", clicks: 2 });
  });

  it("excludes bot events", async () => {
    await seedSession({
      visitorUuid: "99999999-9999-4999-8999-999999999999",
      isBot: true,
      events: [{ type: "github_click", data: { host: "github.com" } }],
    });

    const events = await analytics.getEvents({ days: 30, limit: 10 });
    expect(events.byType).toHaveLength(0);
  });
});

describe("recent activity", () => {
  it("exposes only a truncated session reference, never a full identifier", async () => {
    await seedSession({ visitorUuid: "11111111-1111-4111-8111-111111111111", paths: ["/"] });

    const rows = await analytics.getRecentActivity({ limit: 10 });
    expect(rows).toHaveLength(1);
    // Enough to group rows by visit; not a usable identifier.
    expect(rows[0].session_ref).toHaveLength(8);
    expect(JSON.stringify(rows[0])).not.toContain("11111111-1111-4111-8111-111111111111");
  });
});
