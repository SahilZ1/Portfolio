/**
 * Chart primitives.
 *
 * Hand-built SVG rather than a charting library, for four concrete reasons:
 *
 *  1. Size. Recharts is roughly 100kB gzipped and Chart.js similar, for five
 *     chart types. These primitives are a few kB and pull in nothing.
 *  2. Brand control. Getting a library to render a specific yellow-on-charcoal
 *     system means fighting its theming layer; here the palette is the markup.
 *  3. The flow diagram has to be custom regardless — no general-purpose chart
 *     library draws the visitor-journey Sankey this dashboard needs.
 *  4. Accessibility. Each chart carries a real data table for screen readers
 *     instead of an unlabelled <canvas>, which most libraries produce.
 *
 * Conventions used throughout:
 *  - Charts scale with `viewBox` + `preserveAspectRatio`, so they are
 *    responsive without measuring the container.
 *  - Entrance animation is a stroke-dash reveal or a scale transform, both
 *    compositor-friendly, and disabled under prefers-reduced-motion.
 *  - Every chart has role="img" with an aria-label, plus a visually hidden
 *    table of the same numbers.
 */

import { useId, useMemo } from "react";
import { motion } from "framer-motion";
import { EASE, prefersReducedMotion } from "../../lib/motion.js";

const BRAND = "#ffc800";

/** Accessible table shadowing a chart's data. */
function DataTable({ caption, columns, rows }) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={cellIndex} scope="row">{cell}</th>
              ) : (
                <td key={cellIndex}>{cell}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------- area chart -- */

/**
 * Time-series area chart with an animated line.
 *
 * Draws in a 1000x280 user-space viewBox and scales to fit, so there is no
 * resize observer and no re-render on window resize.
 */
export function AreaChart({ data, valueKey, label, height = 260, formatValue = (v) => v }) {
  const gradientId = useId();
  const reduced = prefersReducedMotion();

  const geometry = useMemo(() => {
    if (!data || data.length === 0) return null;

    const W = 1000;
    const H = 280;
    const padding = { top: 16, right: 8, bottom: 28, left: 8 };
    const innerW = W - padding.left - padding.right;
    const innerH = H - padding.top - padding.bottom;

    const values = data.map((d) => Number(d[valueKey]) || 0);
    // Headroom above the peak so the line never touches the top edge. The
    // floor of 1 stops an all-zero series collapsing to a divide-by-zero.
    const max = Math.max(1, ...values) * 1.15;

    const points = data.map((d, index) => {
      const x = padding.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
      const y = padding.top + innerH - ((Number(d[valueKey]) || 0) / max) * innerH;
      return { x, y, value: Number(d[valueKey]) || 0, date: d.date };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const area = `${line} L${points.at(-1).x.toFixed(2)},${(padding.top + innerH).toFixed(2)} L${points[0].x.toFixed(2)},${(padding.top + innerH).toFixed(2)} Z`;

    // Four horizontal gridlines at even fractions of the scaled max.
    const gridlines = [0.25, 0.5, 0.75, 1].map((fraction) => ({
      y: padding.top + innerH - fraction * innerH,
      value: Math.round(max * fraction),
    }));

    return { W, H, points, line, area, gridlines, baseline: padding.top + innerH, max };
  }, [data, valueKey]);

  if (!geometry) return <ChartEmpty label={label} height={height} />;

  const total = geometry.points.reduce((sum, p) => sum + p.value, 0);
  const peak = geometry.points.reduce((best, p) => (p.value > best.value ? p : best), geometry.points[0]);

  return (
    <figure className="chart" style={{ height }}>
      <svg
        viewBox={`0 0 ${geometry.W} ${geometry.H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}. ${total} total across ${data.length} days, peaking at ${peak.value} on ${peak.date}.`}
        className="chart__svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity="0.30" />
            <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
          </linearGradient>
        </defs>

        {geometry.gridlines.map((gridline) => (
          <line
            key={gridline.y}
            x1="0"
            x2={geometry.W}
            y1={gridline.y}
            y2={gridline.y}
            className="chart__grid"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <motion.path
          d={geometry.area}
          fill={`url(#${gradientId})`}
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: reduced ? 0 : 0.35 }}
        />

        {/* Stroke-dash reveal: the line draws itself left to right. */}
        <motion.path
          d={geometry.line}
          fill="none"
          stroke={BRAND}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.9, ease: EASE }}
        />

        {geometry.points.map((point, index) => (
          <g key={index} className="chart__point-group">
            {/* Wide invisible target so the hover tooltip is reachable. */}
            <rect
              x={point.x - geometry.W / data.length / 2}
              y="0"
              width={geometry.W / data.length}
              height={geometry.H}
              fill="transparent"
            />
            <circle cx={point.x} cy={point.y} r="4.5" className="chart__point" />
            <title>{`${point.date}: ${formatValue(point.value)}`}</title>
          </g>
        ))}
      </svg>

      <div className="chart__axis">
        <span>{data[0]?.date}</span>
        <span>{data.at(-1)?.date}</span>
      </div>

      <DataTable
        caption={label}
        columns={["Date", "Value"]}
        rows={geometry.points.map((p) => [p.date, formatValue(p.value)])}
      />
    </figure>
  );
}

/* -------------------------------------------------------------- bar chart -- */

/**
 * Horizontal ranked bars. Horizontal rather than vertical because the labels
 * are page paths and source names — long strings that would be unreadable
 * rotated under a vertical axis.
 */
export function BarChart({ data, labelKey, valueKey, label, formatValue = (v) => v, maxRows = 8 }) {
  const reduced = prefersReducedMotion();
  const rows = (data ?? []).slice(0, maxRows);

  if (rows.length === 0) return <ChartEmpty label={label} height={160} />;

  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey]) || 0));

  return (
    <figure className="bars" role="img" aria-label={label}>
      {rows.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        const fraction = value / max;
        return (
          <div className="bars__row" key={`${row[labelKey]}-${index}`}>
            <span className="bars__label" title={String(row[labelKey])}>
              {row[labelKey]}
            </span>
            <span className="bars__track">
              <motion.span
                className="bars__fill"
                initial={reduced ? { scaleX: fraction } : { scaleX: 0 }}
                animate={{ scaleX: fraction }}
                transition={{
                  duration: reduced ? 0 : 0.7,
                  ease: EASE,
                  delay: reduced ? 0 : index * 0.05,
                }}
              />
            </span>
            <span className="bars__value">{formatValue(value)}</span>
          </div>
        );
      })}

      <DataTable
        caption={label}
        columns={["Item", "Value"]}
        rows={rows.map((row) => [String(row[labelKey]), formatValue(Number(row[valueKey]) || 0)])}
      />
    </figure>
  );
}

/* ------------------------------------------------------------ donut chart -- */

/**
 * Donut for compositional breakdowns (device split, new vs returning).
 *
 * Segments are drawn as arcs of a single circle using stroke-dasharray, which
 * is far less error-prone than generating arc paths and animates cleanly.
 */
export function DonutChart({ data, labelKey = "label", valueKey = "sessions", label, palette }) {
  const reduced = prefersReducedMotion();
  const rows = (data ?? []).filter((row) => Number(row[valueKey]) > 0);
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey]), 0);

  if (total === 0) return <ChartEmpty label={label} height={180} />;

  const colours = palette ?? ["#ffc800", "#e0a800", "#8a6200", "#5f636c", "#949aa6", "#343945"];
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = rows.map((row, index) => {
    const value = Number(row[valueKey]);
    const fraction = value / total;
    const segment = {
      label: String(row[labelKey]),
      value,
      fraction,
      colour: colours[index % colours.length],
      dash: fraction * circumference,
      offset,
    };
    offset += fraction * circumference;
    return segment;
  });

  return (
    <figure className="donut">
      <svg viewBox="0 0 160 160" role="img" aria-label={label} className="donut__svg">
        {/* Rotated so the first segment starts at twelve o'clock. */}
        <g transform="rotate(-90 80 80)">
          {segments.map((segment, index) => (
            <motion.circle
              key={segment.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={segment.colour}
              strokeWidth="22"
              strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
              strokeDashoffset={-segment.offset}
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.08, ease: EASE }}
            />
          ))}
        </g>
        <text x="80" y="76" className="donut__total">{total}</text>
        <text x="80" y="94" className="donut__caption">sessions</text>
      </svg>

      <ul className="donut__legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className="donut__swatch" style={{ background: segment.colour }} aria-hidden="true" />
            <span className="donut__legend-label">{segment.label}</span>
            <span className="donut__legend-value">
              {Math.round(segment.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>

      <DataTable
        caption={label}
        columns={["Segment", "Sessions", "Share"]}
        rows={segments.map((s) => [s.label, s.value, `${Math.round(s.fraction * 100)}%`])}
      />
    </figure>
  );
}

/* ------------------------------------------------------------------ empty -- */

/**
 * Empty state.
 *
 * Says plainly that there is no data, rather than rendering an axis around
 * nothing. A chart drawn over zero rows implies the measurement failed.
 */
export function ChartEmpty({ label, height = 200, message = "No data in this period yet." }) {
  return (
    <div className="chart-empty" style={{ minHeight: height }}>
      <span className="chart-empty__mark" aria-hidden="true" />
      <p>{message}</p>
      <span className="visually-hidden">{label}: no data.</span>
    </div>
  );
}
