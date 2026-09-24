/**
 * AI insight tests.
 *
 * Two properties are non-negotiable and both are tested here:
 *
 *  1. The application works with no AI provider configured.
 *  2. A model cannot publish a number that is not in the source data.
 *
 * The second is the anti-fabrication control. It is tested by feeding the
 * validator output that contains invented figures and asserting that it is
 * discarded rather than rendered.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { query, pool } from "../src/db/database";
import {
  buildSnapshot,
  buildDeterministicInsights,
  validateAgainstSnapshot,
  getInsights,
  MIN_SESSIONS_FOR_INSIGHTS,
} from "../src/services/insightsService";
import { resetDatabase, appRequire } from "./setup";

// Loaded through appRequire so the stub is installed on the same module
// instance the insights service uses. See the note in setup.js.
const { __setProviderForTests } = appRequire("../src/services/aiProvider.js");

afterAll(() => pool.end());

/** Seed enough human sessions for insights to be offered at all. */
async function seedTraffic(sessionCount, { paths = ["/", "/projects"] } = {}) {
  for (let i = 0; i < sessionCount; i += 1) {
    const uuid = `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`;
    const visitor = await query(
      `INSERT INTO visitors (visitor_uuid, session_count) VALUES ($1, 1) RETURNING id`,
      [uuid]
    );
    const session = await query(
      `INSERT INTO sessions (
         session_uuid, visitor_id, started_at, last_activity, ended_at,
         entry_page, exit_page, traffic_source, device_category,
         browser_family, os_family, is_bot, page_view_count
       )
       VALUES (gen_random_uuid(), $1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour',
               NOW() - INTERVAL '1 hour', $2, $3, 'linkedin', 'desktop',
               'Chrome', 'Windows', FALSE, $4)
       RETURNING id`,
      [visitor.rows[0].id, paths[0], paths.at(-1), paths.length]
    );
    for (const [index, path] of paths.entries()) {
      await query(
        `INSERT INTO page_views (session_id, path, page_title, view_sequence, viewed_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 hours')`,
        [session.rows[0].id, path, `Title ${path}`, index + 1]
      );
    }
  }
}

beforeEach(async () => {
  await resetDatabase();
  __setProviderForTests(null); // default: no AI configured
});

describe("aggregate-only boundary", () => {
  it("includes only counts, rates, labels and internal paths", async () => {
    await seedTraffic(10);
    const snapshot = await buildSnapshot({ days: 30 });
    const serialised = JSON.stringify(snapshot);

    // Nothing that could identify a visitor may cross this boundary.
    expect(serialised).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/i); // no UUIDs
    expect(serialised).not.toMatch(/visitor_uuid|session_uuid|visitorUuid|sessionUuid/);
    expect(serialised).not.toMatch(/password|secret|token|cookie|hash/i);
    expect(serialised).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/); // no IP addresses
    expect(serialised).not.toMatch(/Mozilla|AppleWebKit/); // no user agents
  });

  it("carries the figures the dashboard shows", async () => {
    await seedTraffic(10);
    const snapshot = await buildSnapshot({ days: 30 });

    expect(snapshot.totals.sessions).toBe(10);
    expect(snapshot.totals.uniqueVisitors).toBe(10);
    expect(snapshot.topPages.length).toBeGreaterThan(0);
    expect(snapshot.trafficSources[0].source).toBe("linkedin");
  });
});

describe("without an AI provider", () => {
  it("still returns useful deterministic insights", async () => {
    await seedTraffic(20);
    const result = await getInsights({ days: 30 });

    expect(result.generatedBy).toBe("rules");
    expect(result.aiConfigured).toBe(false);
    expect(result.insights.length).toBeGreaterThan(0);
    // The dashboard must not break, and must not pretend AI produced this.
    expect(result.insights.every((i) => i.source !== "ai")).toBe(true);
  });

  it("withholds insights below the minimum sample size", async () => {
    await seedTraffic(2);
    const result = await getInsights({ days: 30 });

    expect(result.insights).toHaveLength(1);
    expect(result.insights[0].kind).toBe("notice");
    // Percentages over a handful of visits describe noise, and saying so is
    // more useful than reporting "100% of visitors".
    expect(result.insights[0].title).toMatch(/not enough data/i);
  });

  it("produces insights grounded in the seeded figures", async () => {
    await seedTraffic(12, { paths: ["/", "/projects", "/projects/threatscope"] });
    const snapshot = await buildSnapshot({ days: 30 });
    const insights = buildDeterministicInsights(snapshot);

    expect(insights.length).toBeGreaterThan(0);
    // Every deterministic insight must survive its own verifier.
    expect(validateAgainstSnapshot(insights, snapshot)).toHaveLength(insights.length);
  });
});

describe("anti-fabrication verification", () => {
  it("keeps insights whose numbers appear in the snapshot", async () => {
    await seedTraffic(15);
    const snapshot = await buildSnapshot({ days: 30 });

    const kept = validateAgainstSnapshot(
      [{ title: "Sessions recorded", body: `There were ${snapshot.totals.sessions} sessions.`, kind: "neutral" }],
      snapshot
    );
    expect(kept).toHaveLength(1);
  });

  it("discards an insight containing an invented figure", async () => {
    await seedTraffic(15);
    const snapshot = await buildSnapshot({ days: 30 });

    const kept = validateAgainstSnapshot(
      [
        { title: "Traffic surged", body: "Sessions rose by 847% this period.", kind: "positive" },
        { title: "Huge audience", body: "You had 92451 unique visitors.", kind: "positive" },
      ],
      snapshot
    );
    // A model that invents a figure gets its output dropped, not published.
    expect(kept).toHaveLength(0);
  });

  it("discards only the fabricated insight, keeping the sound ones", async () => {
    await seedTraffic(15);
    const snapshot = await buildSnapshot({ days: 30 });

    const kept = validateAgainstSnapshot(
      [
        { title: "Real", body: `${snapshot.totals.sessions} sessions were recorded.`, kind: "neutral" },
        { title: "Invented", body: "Conversion improved by 738%.", kind: "positive" },
      ],
      snapshot
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toBe("Real");
  });

  it("allows small integers and years, which appear in ordinary prose", async () => {
    await seedTraffic(15);
    const snapshot = await buildSnapshot({ days: 30 });

    const kept = validateAgainstSnapshot(
      [{ title: "Top 3 pages", body: "The top 2 pages account for most views in 2026.", kind: "neutral" }],
      snapshot
    );
    expect(kept).toHaveLength(1);
  });

  it("allows a percentage computed from two snapshot figures", async () => {
    await seedTraffic(20);
    const snapshot = await buildSnapshot({ days: 30 });
    const share = Math.round((snapshot.trafficSources[0].sessions / snapshot.totals.sessions) * 100);

    const kept = validateAgainstSnapshot(
      [{ title: "Source share", body: `LinkedIn drove ${share}% of sessions.`, kind: "neutral" }],
      snapshot
    );
    expect(kept).toHaveLength(1);
  });
});

describe("with a stubbed AI provider", () => {
  it("uses verified model output and marks it as AI-generated", async () => {
    await seedTraffic(15);
    const snapshot = await buildSnapshot({ days: 30 });

    __setProviderForTests({
      name: "stub",
      complete: async () =>
        JSON.stringify([
          { title: "Sessions", body: `There were ${snapshot.totals.sessions} sessions.`, kind: "neutral" },
        ]),
    });

    const result = await getInsights({ days: 30, forceRefresh: true });
    expect(result.generatedBy).toBe("ai");
    expect(result.insights[0].source).toBe("ai");
  });

  it("falls back to deterministic insights when the model fabricates everything", async () => {
    await seedTraffic(15);
    __setProviderForTests({
      name: "stub",
      complete: async () =>
        JSON.stringify([{ title: "Nonsense", body: "Traffic grew 91234% overnight.", kind: "positive" }]),
    });

    const result = await getInsights({ days: 30, forceRefresh: true });
    expect(result.generatedBy).toBe("rules");
    expect(result.note).toMatch(/failed number verification/i);
  });

  it("falls back when the provider errors, rather than breaking the dashboard", async () => {
    await seedTraffic(15);
    __setProviderForTests({
      name: "stub",
      complete: async () => {
        throw new Error("provider is down");
      },
    });

    const result = await getInsights({ days: 30, forceRefresh: true });
    expect(result.generatedBy).toBe("rules");
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.note).toMatch(/unavailable/i);
  });

  it("falls back when the provider returns unparseable output", async () => {
    await seedTraffic(15);
    __setProviderForTests({ name: "stub", complete: async () => "I'm sorry, I can't do that." });

    const result = await getInsights({ days: 30, forceRefresh: true });
    expect(result.generatedBy).toBe("rules");
  });

  it("caches on the input digest so identical statistics are not re-sent", async () => {
    await seedTraffic(15);
    const snapshot = await buildSnapshot({ days: 30 });

    let calls = 0;
    __setProviderForTests({
      name: "stub",
      complete: async () => {
        calls += 1;
        return JSON.stringify([
          { title: "Sessions", body: `There were ${snapshot.totals.sessions} sessions.`, kind: "neutral" },
        ]);
      },
    });

    await getInsights({ days: 30, forceRefresh: true });
    expect(calls).toBe(1);

    const second = await getInsights({ days: 30 });
    // Bounds both cost and how much data leaves the server.
    expect(calls).toBe(1);
    expect(second.cached).toBe(true);
  });

  it("does not call the provider below the minimum sample size", async () => {
    await seedTraffic(MIN_SESSIONS_FOR_INSIGHTS - 1);

    let calls = 0;
    __setProviderForTests({
      name: "stub",
      complete: async () => {
        calls += 1;
        return "[]";
      },
    });

    const result = await getInsights({ days: 30, forceRefresh: true });
    expect(calls).toBe(0);
    expect(result.generatedBy).toBe("rules");
  });

  it("sends only the aggregate snapshot to the provider", async () => {
    await seedTraffic(15);

    let received = null;
    __setProviderForTests({
      name: "stub",
      complete: async ({ user }) => {
        received = user;
        return "[]";
      },
    });

    await getInsights({ days: 30, forceRefresh: true });

    expect(received).toBeTruthy();
    expect(received).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/i);
    expect(received).not.toMatch(/password|secret|cookie|session_uuid/i);
  });
});
