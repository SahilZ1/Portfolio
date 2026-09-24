/**
 * Analytics insights.
 *
 * Pipeline:
 *
 *   PostgreSQL -> aggregation (analyticsService) -> compact statistics snapshot
 *              -> deterministic rules  ---------------------> insights
 *              -> AI provider (optional) -------------------> insights
 *
 * Three properties this module is built to guarantee:
 *
 * 1. **Only aggregates leave the server.** `buildSnapshot()` produces counts,
 *    rates and ranked lists. No visitor UUID, no session UUID, no referrer URL,
 *    no cookie, no credential, and no row-level record is ever included. The
 *    snapshot is the complete set of data that can reach a provider, and it is
 *    constructed here so that boundary is auditable in one place.
 *
 * 2. **Numbers come from SQL, never from the model.** The AI is given the
 *    statistics and asked to narrate them. Every returned insight is then
 *    validated against the snapshot, and any sentence containing a number that
 *    does not appear in the source data is discarded. A model that invents a
 *    figure gets its output dropped, not published.
 *
 * 3. **Without a key, nothing breaks.** The deterministic rules below produce
 *    genuinely useful observations on their own; the AI layer is an
 *    enhancement, not a dependency.
 */

const crypto = require("crypto");
const { query } = require("../db/database");
const { config } = require("../config");
const logger = require("../utils/logger");
const { resolveProvider } = require("./aiProvider");
const analytics = require("./analyticsService");

/** Minimum sessions before any insight is offered at all. */
const MIN_SESSIONS_FOR_INSIGHTS = 8;

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

/**
 * Build the aggregated statistics snapshot.
 *
 * This is the AI boundary. Everything in the returned object is a count, a
 * rate, a label or a site-internal path. Read it as the exhaustive list of what
 * a provider can see.
 */
async function buildSnapshot({ days = 30 } = {}) {
  const [overview, series, pages, sources, devices, flows, events] = await Promise.all([
    analytics.getOverview({ days }),
    analytics.getTrafficSeries({ days }),
    analytics.getPages({ days, limit: 8 }),
    analytics.getSources({ days, limit: 8 }),
    analytics.getDevices({ days }),
    analytics.getFlows({ days, limit: 10 }),
    analytics.getEvents({ days, limit: 10 }),
  ]);

  return {
    windowDays: days,
    totals: {
      uniqueVisitors: overview.metrics.uniqueVisitors.value,
      previousUniqueVisitors: overview.metrics.uniqueVisitors.previous,
      sessions: overview.metrics.sessions.value,
      previousSessions: overview.metrics.sessions.previous,
      pageViews: overview.metrics.pageViews.value,
      previousPageViews: overview.metrics.pageViews.previous,
      pagesPerSession: overview.metrics.pagesPerSession.value,
      avgSessionSeconds: overview.metrics.avgSessionSeconds.value,
      previousAvgSessionSeconds: overview.metrics.avgSessionSeconds.previous,
      bounceRatePercent: overview.metrics.bounceRate.value,
      previousBounceRatePercent: overview.metrics.bounceRate.previous,
      returningVisitorPercent: overview.metrics.returningRate.value,
    },
    dailySeries: series.map((d) => ({ date: d.date, sessions: d.sessions, pageViews: d.pageViews })),
    topPages: pages.topPages.map((p) => ({ path: p.path, views: p.views, avgSeconds: p.avgSeconds })),
    topProjects: pages.topProjects.map((p) => ({ path: p.path, views: p.views })),
    topLabs: pages.topLabs.map((p) => ({ path: p.path, views: p.views })),
    entryPages: pages.entryPages.map((p) => ({ path: p.path, sessions: p.sessions })),
    exitPages: pages.exitPages.map((p) => ({ path: p.path, sessions: p.sessions })),
    trafficSources: sources.sources.map((s) => ({
      source: s.source,
      sessions: s.sessions,
      pagesPerSession: s.pagesPerSession,
    })),
    devices: devices.devices,
    commonJourneys: flows.journeys.slice(0, 6).map((j) => ({ steps: j.steps, sessions: j.sessions })),
    topTransitions: flows.transitions.slice(0, 8),
    eventsByType: events.byType,
    outboundHosts: events.outbound,
  };
}

/**
 * Deterministic insights derived directly from the snapshot.
 *
 * These are always produced, with or without an AI provider. Each one states a
 * fact and cites the numbers behind it, so a reader can verify it against the
 * charts on the same screen.
 */
function buildDeterministicInsights(snapshot) {
  const insights = [];
  const { totals } = snapshot;

  if (totals.sessions < MIN_SESSIONS_FOR_INSIGHTS) {
    return [
      {
        title: "Not enough data yet",
        body: `Only ${totals.sessions} session${totals.sessions === 1 ? "" : "s"} recorded in the last ${snapshot.windowDays} days. Insights are withheld below ${MIN_SESSIONS_FOR_INSIGHTS} sessions, because percentages over a handful of visits describe noise rather than behaviour.`,
        kind: "notice",
        metrics: ["sessions"],
      },
    ];
  }

  const sessionChange = percentChange(totals.sessions, totals.previousSessions);
  if (sessionChange !== null && Math.abs(sessionChange) >= 10) {
    insights.push({
      title: sessionChange > 0 ? "Traffic is up on the previous period" : "Traffic is down on the previous period",
      body: `Sessions moved from ${totals.previousSessions} to ${totals.sessions} (${sessionChange > 0 ? "+" : ""}${sessionChange}%) compared with the preceding ${snapshot.windowDays} days.`,
      kind: sessionChange > 0 ? "positive" : "attention",
      metrics: ["sessions"],
    });
  }

  const topSource = snapshot.trafficSources[0];
  if (topSource && totals.sessions > 0) {
    const share = Number(((topSource.sessions / totals.sessions) * 100).toFixed(1));
    insights.push({
      title: `${topSource.source === "direct" ? "Most traffic has no referrer" : `${topSource.source} is the largest source`}`,
      body:
        topSource.source === "direct"
          ? `${topSource.sessions} of ${totals.sessions} sessions (${share}%) arrived with no referrer. That covers typed URLs, bookmarks, and apps that strip the referrer header — it is not evidence of direct navigation on its own.`
          : `${topSource.source} accounted for ${topSource.sessions} of ${totals.sessions} sessions (${share}%), averaging ${topSource.pagesPerSession} pages per session.`,
      kind: "neutral",
      metrics: ["trafficSources"],
    });
  }

  // Compare engagement of a section against the site-wide mean.
  const labViews = snapshot.topLabs.reduce((sum, entry) => sum + (entry.views ?? 0), 0);
  const projectViews = snapshot.topProjects.reduce((sum, entry) => sum + (entry.views ?? 0), 0);
  if (labViews > 0 || projectViews > 0) {
    insights.push({
      title: projectViews >= labViews ? "Projects draw more views than Cyber Lab" : "Cyber Lab draws more views than Projects",
      body: `Project detail pages recorded ${projectViews} views and Cyber Lab write-ups recorded ${labViews} over the last ${snapshot.windowDays} days.`,
      kind: "neutral",
      metrics: ["topProjects", "topLabs"],
    });
  }

  if (totals.bounceRatePercent >= 60 && snapshot.exitPages.length > 0) {
    const worst = snapshot.exitPages[0];
    insights.push({
      title: "Single-page visits are the dominant pattern",
      body: `${totals.bounceRatePercent}% of sessions viewed only one page, and the most common last page was ${worst.path} with ${worst.sessions} sessions ending there.`,
      kind: "attention",
      metrics: ["bounceRatePercent", "exitPages"],
    });
  }

  const durationChange = percentChange(totals.avgSessionSeconds, totals.previousAvgSessionSeconds);
  if (durationChange !== null && Math.abs(durationChange) >= 15) {
    insights.push({
      title: durationChange > 0 ? "Visits are lasting longer" : "Visits are getting shorter",
      body: `Average session duration moved from ${formatDuration(totals.previousAvgSessionSeconds)} to ${formatDuration(totals.avgSessionSeconds)} (${durationChange > 0 ? "+" : ""}${durationChange}%).`,
      kind: durationChange > 0 ? "positive" : "attention",
      metrics: ["avgSessionSeconds"],
    });
  }

  const journey = snapshot.commonJourneys[0];
  if (journey && journey.steps.length > 1) {
    insights.push({
      title: "Most common path through the site",
      body: `${journey.steps.join(" → ")} — followed by ${journey.sessions} session${journey.sessions === 1 ? "" : "s"}.`,
      kind: "neutral",
      metrics: ["commonJourneys"],
    });
  }

  const outbound = snapshot.outboundHosts[0];
  if (outbound && outbound.clicks > 0) {
    insights.push({
      title: "Where visitors go next",
      body: `${outbound.host} was the most clicked outbound destination, with ${outbound.clicks} click${outbound.clicks === 1 ? "" : "s"}.`,
      kind: "positive",
      metrics: ["outboundHosts"],
    });
  }

  return insights;
}

/**
 * Collect every number present in the snapshot, so AI output can be checked
 * against the source data rather than taken on trust.
 */
function collectAllowedNumbers(value, accumulator = new Set()) {
  if (typeof value === "number" && Number.isFinite(value)) {
    accumulator.add(Number(value.toFixed(2)));
    accumulator.add(Math.round(value));
    return accumulator;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectAllowedNumbers(entry, accumulator));
    return accumulator;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectAllowedNumbers(entry, accumulator));
  }
  return accumulator;
}

/**
 * Reject any AI sentence containing a figure absent from the snapshot.
 *
 * This is the anti-fabrication control. Small integers (0-3) and years are
 * allowed through because they appear in ordinary prose ("the top 3 pages")
 * without being claims about the data.
 */
function validateAgainstSnapshot(insights, snapshot) {
  const allowed = collectAllowedNumbers(snapshot);
  // Derived figures a model may legitimately compute from the snapshot.
  const totals = snapshot.totals;
  snapshot.trafficSources.forEach((source) => {
    if (totals.sessions > 0) {
      allowed.add(Number(((source.sessions / totals.sessions) * 100).toFixed(1)));
      allowed.add(Math.round((source.sessions / totals.sessions) * 100));
    }
  });

  const kept = [];
  const dropped = [];

  for (const insight of insights) {
    const text = `${insight.title} ${insight.body}`;
    const numbers = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    const fabricated = numbers.filter((number) => {
      if (number <= 3) return false; // "the top 3", "two of the"
      if (number >= 1990 && number <= 2100) return false; // a year
      return !allowed.has(number) && !allowed.has(Math.round(number));
    });

    if (fabricated.length > 0) {
      dropped.push({ title: insight.title, fabricated });
    } else {
      kept.push({ ...insight, source: "ai" });
    }
  }

  if (dropped.length > 0) {
    logger.warn("Discarded AI insights containing unverifiable figures", {
      dropped: dropped.length,
      details: dropped,
    });
  }

  return kept;
}

const SYSTEM_PROMPT = `You are a web analytics assistant for a personal cybersecurity portfolio site.

You will receive a JSON object of pre-aggregated statistics. Write short, factual observations about it.

Rules you must follow exactly:
- Every number you write MUST appear in the provided JSON, or be a percentage you compute directly from two numbers in it. Never estimate, round loosely, or invent a figure.
- If the data does not support a claim, do not make the claim. Fewer, well-supported observations are better than many speculative ones.
- Do not speculate about who the visitors are, their identity, employer, or intent. You have anonymous aggregate counts and nothing else.
- "direct" means no referrer was supplied. It does not mean the visitor typed the URL. Never describe it as intentional navigation.
- Be plain and concise. No marketing language, no exclamation marks, no filler.

Respond with ONLY a JSON array, no prose around it, of at most 5 objects:
[{"title": "short title, max 60 chars", "body": "1-2 sentences citing specific numbers", "kind": "positive|neutral|attention"}]`;

/**
 * Generate insights, preferring AI when configured and falling back silently.
 *
 * @returns {Promise<{ insights: Array, generatedBy: string, provider: string|null, cached: boolean, snapshotDigest: string }>}
 */
async function getInsights({ days = 30, forceRefresh = false } = {}) {
  const snapshot = await buildSnapshot({ days });
  const deterministic = buildDeterministicInsights(snapshot);

  const provider = resolveProvider();
  const periodKey = `overview:${days}d`;
  const digest = crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 32);

  // No provider, or too little data to say anything responsible about.
  if (!provider || snapshot.totals.sessions < MIN_SESSIONS_FOR_INSIGHTS) {
    return {
      insights: deterministic,
      generatedBy: "rules",
      provider: null,
      cached: false,
      snapshotDigest: digest,
      aiConfigured: Boolean(provider),
    };
  }

  if (!forceRefresh) {
    const cached = await query(
      `SELECT payload FROM ai_insight_cache
        WHERE period_key = $1 AND input_digest = $2 AND expires_at > NOW()
        LIMIT 1`,
      [periodKey, digest]
    );
    if (cached.rows.length > 0) {
      return {
        insights: cached.rows[0].payload.insights ?? deterministic,
        generatedBy: "ai",
        provider: provider.name,
        cached: true,
        snapshotDigest: digest,
        aiConfigured: true,
      };
    }
  }

  try {
    const completion = await provider.complete({
      system: SYSTEM_PROMPT,
      user: JSON.stringify(snapshot),
      maxTokens: 1000,
    });

    // Models sometimes wrap JSON in a fenced block despite instructions.
    const jsonText = completion.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) throw new Error("Provider did not return an array");

    const shaped = parsed.slice(0, 5).map((entry) => ({
      title: String(entry.title ?? "").slice(0, 80),
      body: String(entry.body ?? "").slice(0, 400),
      kind: ["positive", "neutral", "attention"].includes(entry.kind) ? entry.kind : "neutral",
    }));

    const validated = validateAgainstSnapshot(shaped, snapshot);

    // If validation rejected everything, the model was not usable this time.
    if (validated.length === 0) {
      return {
        insights: deterministic,
        generatedBy: "rules",
        provider: provider.name,
        cached: false,
        snapshotDigest: digest,
        aiConfigured: true,
        note: "AI output failed number verification and was discarded.",
      };
    }

    const payload = { insights: validated, snapshotDigest: digest };
    await query(
      `INSERT INTO ai_insight_cache (period_key, input_digest, provider, model, payload, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(secs => $6::NUMERIC / 1000))
       ON CONFLICT (period_key, input_digest)
       DO UPDATE SET payload = EXCLUDED.payload,
                     generated_at = NOW(),
                     expires_at = EXCLUDED.expires_at`,
      [periodKey, digest, provider.name, config.ai.model, JSON.stringify(payload), String(config.ai.cacheTtlMs)]
    );

    return {
      insights: validated,
      generatedBy: "ai",
      provider: provider.name,
      cached: false,
      snapshotDigest: digest,
      aiConfigured: true,
    };
  } catch (error) {
    // A provider outage, a timeout, or malformed output must never take the
    // dashboard down. Fall back and carry on.
    logger.warn("AI insight generation failed; serving deterministic insights", {
      message: error.message,
    });
    return {
      insights: deterministic,
      generatedBy: "rules",
      provider: provider.name,
      cached: false,
      snapshotDigest: digest,
      aiConfigured: true,
      note: "AI provider unavailable; showing rule-based insights.",
    };
  }
}

module.exports = {
  getInsights,
  buildSnapshot,
  buildDeterministicInsights,
  validateAgainstSnapshot,
  MIN_SESSIONS_FOR_INSIGHTS,
};
