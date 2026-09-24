/**
 * Analytics console.
 *
 * All panels load in parallel from a single effect, so one slow query does not
 * serialise behind another. Each panel renders a skeleton while loading and an
 * explicit empty state when there is genuinely nothing to show — a chart drawn
 * over zero rows implies the measurement failed rather than that nothing
 * happened.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, ApiError } from "../lib/api.js";
import { EASE } from "../lib/motion.js";
import { site } from "../content/site.js";
import { MetricTile } from "./components/MetricTile.jsx";
import { AreaChart, BarChart, DonutChart, ChartEmpty } from "./components/Charts.jsx";
import { TrafficFlow } from "./components/TrafficFlow.jsx";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

const SOURCE_LABELS = {
  direct: "Direct / unknown",
  google: "Google",
  linkedin: "LinkedIn",
  github: "GitHub",
  search: "Other search",
  x: "X",
  reddit: "Reddit",
  youtube: "YouTube",
  social: "Social",
  email: "Email",
  referral: "Referral",
  internal: "Internal",
  other: "Other",
};

const EVENT_LABELS = {
  page_view: "Page view",
  project_view: "Project view",
  lab_view: "Lab view",
  github_click: "GitHub click",
  external_link_click: "Outbound click",
  contact_click: "Contact click",
  resume_download: "Résumé download",
  cta_click: "CTA click",
  section_view: "Section view",
  copy_email: "Email copied",
};

function formatDuration(seconds) {
  const total = Math.round(seconds ?? 0);
  if (total <= 0) return "0s";
  const minutes = Math.floor(total / 60);
  return minutes > 0 ? `${minutes}m ${total % 60}s` : `${total}s`;
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Panel wrapper with a consistent heading, skeleton and entrance. */
function Panel({ title, subtitle, loading, children, wide = false, action }) {
  return (
    <motion.section
      className={`panel ${wide ? "panel--wide" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <header className="panel__head">
        <div>
          <h2 className="panel__title">{title}</h2>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      {loading ? <div className="skeleton" aria-hidden="true" /> : children}
    </motion.section>
  );
}

export function Dashboard({ user, onSignOut }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingInsights, setRefreshingInsights] = useState(false);

  const load = useCallback(async (windowDays) => {
    setLoading(true);
    setError(null);
    try {
      // Parallel: each endpoint is independent, so the console is as slow as
      // its slowest query rather than the sum of all of them.
      const [overview, traffic, pages, sources, devices, flows, events, activity, insights] =
        await Promise.all([
          api.analytics.overview(windowDays),
          api.analytics.traffic(windowDays),
          api.analytics.pages(windowDays, 8),
          api.analytics.sources(windowDays, 8),
          api.analytics.devices(windowDays),
          api.analytics.flows(windowDays, 14),
          api.analytics.events(windowDays, 12),
          api.analytics.activity(14),
          api.analytics.insights(windowDays),
        ]);

      setData({ overview, traffic, pages, sources, devices, flows, events, activity, insights });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        // Session expired while the console was open.
        onSignOut();
        return;
      }
      setError("Could not load analytics. Check the server and try again.");
    } finally {
      setLoading(false);
    }
  }, [onSignOut]);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const refreshInsights = async () => {
    setRefreshingInsights(true);
    try {
      const insights = await api.analytics.insights(days, true);
      setData((previous) => ({ ...previous, insights }));
    } catch {
      /* keep the existing insights on screen */
    } finally {
      setRefreshingInsights(false);
    }
  };

  const { overview, traffic, pages, sources, devices, flows, events, activity, insights } = data;
  const metrics = overview?.metrics ?? {};
  const realtime = overview?.realtime ?? {};

  return (
    <div className="console">
      <header className="console__bar">
        <div className="console__bar-inner">
          <div className="console__identity">
            <span className="console__mark" aria-hidden="true" />
            <div>
              <p className="console__title">Analytics console</p>
              <p className="console__subtitle">{site.name} · first-party</p>
            </div>
          </div>

          <div className="console__live" title="Sessions active in the last 30 minutes">
            <span className="console__pulse" aria-hidden="true" />
            <span className="console__live-count">{realtime.activeNow ?? 0}</span>
            <span className="console__live-label">active now</span>
          </div>

          <div className="console__actions">
            <Link to="/" className="console__link">View site</Link>
            <button type="button" className="console__signout" onClick={onSignOut}>
              Sign out<span className="visually-hidden"> — {user?.username}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="console__body">
        <div className="console__range" role="group" aria-label="Reporting period">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={`range ${days === range.days ? "is-active" : ""}`}
              onClick={() => setDays(range.days)}
              aria-pressed={days === range.days}
            >
              {range.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="console__error" role="alert">
            {error}
            <button type="button" className="btn btn--small" onClick={() => load(days)}>
              Retry
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- headline -- */}
        <section className="tiles" aria-label="Headline metrics">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="tile tile--skeleton" aria-hidden="true" />
              ))
            : (
              <>
                <MetricTile label="Unique visitors" metric={metrics.uniqueVisitors} />
                <MetricTile label="Sessions" metric={metrics.sessions} />
                <MetricTile label="Page views" metric={metrics.pageViews} />
                <MetricTile
                  label="Pages / session"
                  metric={metrics.pagesPerSession}
                  format={(value) => value.toFixed(2)}
                />
                <MetricTile
                  label="Avg. session"
                  metric={metrics.avgSessionSeconds}
                  format={formatDuration}
                  hint="Measured across sessions with more than one page view."
                />
                <MetricTile
                  label="Bounce rate"
                  metric={metrics.bounceRate}
                  format={(value) => value.toFixed(1)}
                  suffix="%"
                  invertDelta
                  hint="Share of sessions that viewed exactly one page."
                />
              </>
            )}
        </section>

        <section className="strip" aria-label="Rolling visitor counts">
          <div><span className="strip__value">{realtime.visitorsToday ?? 0}</span><span className="strip__label">today</span></div>
          <div><span className="strip__value">{realtime.visitorsThisWeek ?? 0}</span><span className="strip__label">this week</span></div>
          <div><span className="strip__value">{realtime.visitorsThisMonth ?? 0}</span><span className="strip__label">this month</span></div>
          <div><span className="strip__value">{realtime.visitorsAllTime ?? 0}</span><span className="strip__label">all time</span></div>
          <div>
            <span className="strip__value">{(metrics.returningRate?.value ?? 0).toFixed(1)}%</span>
            <span className="strip__label">returning</span>
          </div>
        </section>

        {/* -------------------------------------------------------- AI -- */}
        <Panel
          title="Insights"
          subtitle={
            insights?.generatedBy === "ai"
              ? `Generated by ${insights.provider}${insights.cached ? " · cached" : ""} · every figure verified against the source data`
              : "Rule-based. Configure AI_PROVIDER and AI_API_KEY for model-generated commentary."
          }
          loading={loading}
          wide
          action={
            insights?.aiConfigured ? (
              <button
                type="button"
                className="panel__action"
                onClick={refreshInsights}
                disabled={refreshingInsights}
              >
                {refreshingInsights ? "Regenerating…" : "Regenerate"}
              </button>
            ) : null
          }
        >
          {insights?.insights?.length > 0 ? (
            <ul className="insights">
              {insights.insights.map((insight, index) => (
                <motion.li
                  key={index}
                  className={`insight insight--${insight.kind ?? "neutral"}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35, ease: EASE }}
                >
                  <h3 className="insight__title">{insight.title}</h3>
                  <p className="insight__body">{insight.body}</p>
                  {insight.source === "ai" && <span className="insight__tag">AI</span>}
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="panel__empty">No insights available for this period.</p>
          )}
          {insights?.note && <p className="panel__note">{insights.note}</p>}
        </Panel>

        {/* ---------------------------------------------------- traffic -- */}
        <Panel title="Traffic over time" subtitle={`Sessions per day, last ${days} days`} loading={loading} wide>
          <AreaChart data={traffic?.series ?? []} valueKey="sessions" label="Sessions per day" />
        </Panel>

        <Panel title="Page views over time" subtitle={`Page views per day, last ${days} days`} loading={loading} wide>
          <AreaChart data={traffic?.series ?? []} valueKey="pageViews" label="Page views per day" height={200} />
        </Panel>

        {/* ------------------------------------------------------- flow -- */}
        <Panel
          title="Visitor journeys"
          subtitle="Source → entry page → next page. Ribbon thickness is session volume; hover a node to isolate its paths."
          loading={loading}
          wide
        >
          <TrafficFlow flows={flows} sourceLabels={SOURCE_LABELS} />
        </Panel>

        {/* --------------------------------------------------- breakdowns -- */}
        <div className="console__grid">
          <Panel title="Top pages" subtitle="By views" loading={loading}>
            <BarChart data={pages?.topPages ?? []} labelKey="path" valueKey="views" label="Top pages by views" />
          </Panel>

          <Panel title="Traffic sources" subtitle="Sessions by acquisition channel" loading={loading}>
            <BarChart
              data={(sources?.sources ?? []).map((s) => ({ ...s, label: s.label }))}
              labelKey="label"
              valueKey="sessions"
              label="Sessions by traffic source"
            />
          </Panel>

          <Panel title="Projects" subtitle="Case study views" loading={loading}>
            {pages?.topProjects?.length > 0 ? (
              <BarChart data={pages.topProjects} labelKey="path" valueKey="views" label="Project views" />
            ) : (
              <ChartEmpty label="Project views" height={140} message="No project pages viewed in this period." />
            )}
          </Panel>

          <Panel title="Cyber Lab" subtitle="Write-up views" loading={loading}>
            {pages?.topLabs?.length > 0 ? (
              <BarChart data={pages.topLabs} labelKey="path" valueKey="views" label="Lab views" />
            ) : (
              <ChartEmpty label="Lab views" height={140} message="No lab write-ups viewed in this period." />
            )}
          </Panel>

          <Panel title="Devices" subtitle="Session share by device category" loading={loading}>
            <DonutChart data={devices?.devices ?? []} label="Sessions by device category" />
          </Panel>

          <Panel title="Browsers" subtitle="Family only — no version strings stored" loading={loading}>
            <BarChart data={devices?.browsers ?? []} labelKey="label" valueKey="sessions" label="Sessions by browser" />
          </Panel>

          <Panel title="Operating systems" subtitle="Family only" loading={loading}>
            <BarChart
              data={devices?.operatingSystems ?? []}
              labelKey="label"
              valueKey="sessions"
              label="Sessions by operating system"
            />
          </Panel>

          <Panel title="Referrers" subtitle="Hostnames that linked here" loading={loading}>
            {sources?.referrers?.length > 0 ? (
              <BarChart data={sources.referrers} labelKey="host" valueKey="sessions" label="Referring hosts" />
            ) : (
              <ChartEmpty
                label="Referring hosts"
                height={140}
                message="No referrers recorded. Most arrivals send no referrer header."
              />
            )}
          </Panel>

          <Panel title="Entry pages" subtitle="Where visits begin" loading={loading}>
            <BarChart data={pages?.entryPages ?? []} labelKey="path" valueKey="sessions" label="Entry pages" />
          </Panel>

          <Panel title="Exit pages" subtitle="Where visits end" loading={loading}>
            <BarChart data={pages?.exitPages ?? []} labelKey="path" valueKey="sessions" label="Exit pages" />
          </Panel>

          <Panel title="Events" subtitle="Tracked interactions" loading={loading}>
            {events?.byType?.length > 0 ? (
              <BarChart
                data={events.byType.map((e) => ({ ...e, label: EVENT_LABELS[e.type] ?? e.type }))}
                labelKey="label"
                valueKey="count"
                label="Events by type"
              />
            ) : (
              <ChartEmpty label="Events by type" height={140} message="No interaction events in this period." />
            )}
          </Panel>

          <Panel title="Outbound clicks" subtitle="Destination hostname only" loading={loading}>
            {events?.outbound?.length > 0 ? (
              <BarChart data={events.outbound} labelKey="host" valueKey="clicks" label="Outbound clicks by host" />
            ) : (
              <ChartEmpty label="Outbound clicks" height={140} message="No outbound clicks in this period." />
            )}
          </Panel>
        </div>

        {/* ---------------------------------------------------- activity -- */}
        <Panel title="Recent activity" subtitle="Latest page views across all sessions" loading={loading} wide>
          {activity?.activity?.length > 0 ? (
            <div className="activity">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col">Source</th>
                    <th scope="col">Device</th>
                    <th scope="col">Visit</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.activity.map((row, index) => (
                    <motion.tr
                      key={`${row.at}-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.3 }}
                    >
                      <td>
                        <span className="activity__path">{row.path}</span>
                        {row.title && <span className="activity__title">{row.title}</span>}
                      </td>
                      <td>{SOURCE_LABELS[row.source] ?? row.source ?? "—"}</td>
                      <td className="activity__device">
                        {row.device ?? "—"}
                        {row.browser ? ` · ${row.browser}` : ""}
                      </td>
                      <td>
                        {/* Short session prefix only: enough to see that several
                            rows belong to one visit, not a usable identifier. */}
                        <code className="activity__session">{row.session_ref}</code>
                        <span className="activity__seq">#{row.sequence}</span>
                      </td>
                      <td className="activity__time">{relativeTime(row.at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="panel__empty">No activity recorded yet.</p>
          )}
        </Panel>

        <footer className="console__foot">
          <p>
            Figures exclude traffic classified as bots. Identifiers are pseudonymous and
            derived from nothing about the visitor.{" "}
            <Link to="/privacy">Disclosure</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
