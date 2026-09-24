/**
 * Visitor traffic-flow diagram.
 *
 * Renders the journey through the site as three columns — acquisition source,
 * entry page, next page — connected by ribbons whose thickness is proportional
 * to session volume, with packets travelling along them in the direction of
 * travel.
 *
 * Why the animation earns its place: the single most important thing this
 * diagram communicates is *direction*. A static Sankey leaves the reader to
 * infer which way traffic moves from left-to-right convention alone. Moving
 * packets state it. The motion is carrying information, not decorating.
 *
 * Built as one inline SVG with CSS-animated packets:
 *  - Ribbons are cubic Béziers between column edges, so they read as flow
 *    rather than as a bar chart with lines.
 *  - Packets use `offset-path` where supported, which the browser animates
 *    without JavaScript. There is no rAF loop anywhere in this component.
 *  - Hovering or focusing a node dims everything not connected to it, so a
 *    busy diagram can still be read one path at a time.
 *  - Under prefers-reduced-motion the packets are not rendered at all and
 *    arrowheads are shown instead, so direction is still conveyed.
 */

import { useId, useMemo, useState } from "react";
import { prefersReducedMotion } from "../../lib/motion.js";

const WIDTH = 1000;
const NODE_WIDTH = 13;
const COLUMN_GAP = 300;
const NODE_GAP = 10;
const MIN_NODE_HEIGHT = 16;

/** Shorten a page path for display without losing the meaningful tail. */
function shortPath(path) {
  if (!path) return "—";
  if (path === "/") return "/ (home)";
  if (path.length <= 26) return path;
  return `…${path.slice(-24)}`;
}

/**
 * Lay out one column of nodes, distributing available height in proportion to
 * each node's volume.
 */
function layoutColumn(items, x, height, total) {
  const usableHeight = height - NODE_GAP * Math.max(0, items.length - 1);
  let cursor = 0;

  return items.map((item) => {
    const share = total > 0 ? item.value / total : 0;
    const nodeHeight = Math.max(MIN_NODE_HEIGHT, share * usableHeight);
    const node = { ...item, x, y: cursor, height: nodeHeight };
    cursor += nodeHeight + NODE_GAP;
    return node;
  });
}

/** Cubic Bézier ribbon between two node edges. */
function ribbonPath(x1, y1, h1, x2, y2, h2) {
  const controlOffset = (x2 - x1) * 0.5;
  return [
    `M${x1},${y1}`,
    `C${x1 + controlOffset},${y1} ${x2 - controlOffset},${y2} ${x2},${y2}`,
    `L${x2},${y2 + h2}`,
    `C${x2 - controlOffset},${y2 + h2} ${x1 + controlOffset},${y1 + h1} ${x1},${y1 + h1}`,
    "Z",
  ].join(" ");
}

/** Centre-line of a ribbon, used as the packet's travel path. */
function centreLine(x1, y1, h1, x2, y2, h2) {
  const controlOffset = (x2 - x1) * 0.5;
  const startY = y1 + h1 / 2;
  const endY = y2 + h2 / 2;
  return `M${x1},${startY} C${x1 + controlOffset},${startY} ${x2 - controlOffset},${endY} ${x2},${endY}`;
}

export function TrafficFlow({ flows, sourceLabels = {} }) {
  const gradientId = useId();
  const [focused, setFocused] = useState(null);
  const reduced = prefersReducedMotion();

  const model = useMemo(() => {
    const entries = flows?.entries ?? [];
    const transitions = flows?.transitions ?? [];
    if (entries.length === 0) return null;

    // --- Column 1: acquisition sources -------------------------------------
    const sourceTotals = new Map();
    for (const entry of entries) {
      sourceTotals.set(entry.source, (sourceTotals.get(entry.source) ?? 0) + entry.sessions);
    }
    const sources = [...sourceTotals.entries()]
      .map(([id, value]) => ({ id: `source:${id}`, name: sourceLabels[id] ?? id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // --- Column 2: entry pages ---------------------------------------------
    const entryTotals = new Map();
    for (const entry of entries) {
      entryTotals.set(entry.path, (entryTotals.get(entry.path) ?? 0) + entry.sessions);
    }
    const entryPages = [...entryTotals.entries()]
      .map(([path, value]) => ({ id: `entry:${path}`, name: shortPath(path), path, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // --- Column 3: where they went next ------------------------------------
    const nextTotals = new Map();
    for (const transition of transitions) {
      nextTotals.set(transition.to, (nextTotals.get(transition.to) ?? 0) + transition.count);
    }
    const nextPages = [...nextTotals.entries()]
      .map(([path, value]) => ({ id: `next:${path}`, name: shortPath(path), path, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Height driven by the busiest column, so nodes never get unreadably thin.
    const rowCount = Math.max(sources.length, entryPages.length, nextPages.length);
    const height = Math.max(260, rowCount * 52);

    const sourceTotal = sources.reduce((sum, node) => sum + node.value, 0);
    const entryTotal = entryPages.reduce((sum, node) => sum + node.value, 0);
    const nextTotal = nextPages.reduce((sum, node) => sum + node.value, 0);

    const columnOne = layoutColumn(sources, 0, height, sourceTotal);
    const columnTwo = layoutColumn(entryPages, COLUMN_GAP + NODE_WIDTH, height, entryTotal);
    const columnThree = layoutColumn(nextPages, (COLUMN_GAP + NODE_WIDTH) * 2, height, nextTotal);

    const byId = new Map([...columnOne, ...columnTwo, ...columnThree].map((n) => [n.id, n]));

    /** Build ribbons for one stage, stacking them within each node's height. */
    function buildLinks(records, fromKey, toKey, valueKey) {
      const fromCursors = new Map();
      const toCursors = new Map();
      const links = [];

      for (const record of [...records].sort((a, b) => b[valueKey] - a[valueKey])) {
        const from = byId.get(record[fromKey]);
        const to = byId.get(record[toKey]);
        if (!from || !to) continue;

        const fromShare = from.value > 0 ? record[valueKey] / from.value : 0;
        const toShare = to.value > 0 ? record[valueKey] / to.value : 0;
        const fromHeight = Math.max(2, fromShare * from.height);
        const toHeight = Math.max(2, toShare * to.height);

        const fromOffset = fromCursors.get(from.id) ?? 0;
        const toOffset = toCursors.get(to.id) ?? 0;

        links.push({
          id: `${record[fromKey]}->${record[toKey]}`,
          fromId: from.id,
          toId: to.id,
          value: record[valueKey],
          path: ribbonPath(
            from.x + NODE_WIDTH, from.y + fromOffset, fromHeight,
            to.x, to.y + toOffset, toHeight
          ),
          line: centreLine(
            from.x + NODE_WIDTH, from.y + fromOffset, fromHeight,
            to.x, to.y + toOffset, toHeight
          ),
        });

        fromCursors.set(from.id, fromOffset + fromHeight);
        toCursors.set(to.id, toOffset + toHeight);
      }
      return links;
    }

    const stageOne = buildLinks(
      entries.map((e) => ({ from: `source:${e.source}`, to: `entry:${e.path}`, value: e.sessions })),
      "from", "to", "value"
    );

    const stageTwo = buildLinks(
      transitions.map((t) => ({ from: `entry:${t.from}`, to: `next:${t.to}`, value: t.count })),
      "from", "to", "value"
    );

    return {
      height,
      nodes: [...columnOne, ...columnTwo, ...columnThree],
      links: [...stageOne, ...stageTwo],
      columns: [
        { x: 0, label: "Source" },
        { x: COLUMN_GAP + NODE_WIDTH, label: "Entry page" },
        { x: (COLUMN_GAP + NODE_WIDTH) * 2, label: "Next page" },
      ],
    };
  }, [flows, sourceLabels]);

  if (!model) {
    return (
      <div className="chart-empty" style={{ minHeight: 260 }}>
        <span className="chart-empty__mark" aria-hidden="true" />
        <p>Not enough journey data yet. Flows appear once visitors view more than one page.</p>
      </div>
    );
  }

  const isDimmed = (link) =>
    focused !== null && link.fromId !== focused && link.toId !== focused;

  const isNodeDimmed = (node) => {
    if (focused === null) return false;
    if (node.id === focused) return false;
    return !model.links.some(
      (link) =>
        (link.fromId === focused && link.toId === node.id) ||
        (link.toId === focused && link.fromId === node.id)
    );
  };

  return (
    <figure className="flowviz">
      <svg
        viewBox={`0 0 ${WIDTH} ${model.height + 34}`}
        className="flowviz__svg"
        role="img"
        aria-label="Visitor journey: traffic source to entry page to next page, with ribbon thickness proportional to session count."
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffc800" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#ffc800" stopOpacity="0.14" />
          </linearGradient>
          {reduced && (
            <marker
              id={`${gradientId}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#ffc800" />
            </marker>
          )}
        </defs>

        <g transform="translate(0, 28)">
          {/* Ribbons first, so nodes sit on top of them. */}
          <g className="flowviz__links">
            {model.links.map((link) => (
              <g key={link.id} className={isDimmed(link) ? "is-dimmed" : ""}>
                <path d={link.path} fill={`url(#${gradientId})`} className="flowviz__ribbon" />
                <title>{`${link.value} session${link.value === 1 ? "" : "s"}`}</title>

                {reduced ? (
                  <path
                    d={link.line}
                    fill="none"
                    stroke="#ffc800"
                    strokeWidth="1"
                    opacity="0.5"
                    markerEnd={`url(#${gradientId}-arrow)`}
                  />
                ) : (
                  /* Packet travelling the ribbon's centre line. `offset-path`
                     is animated entirely by the browser — no JS loop. */
                  <circle
                    r="3"
                    className="flowviz__packet"
                    style={{
                      offsetPath: `path("${link.line}")`,
                      animationDelay: `${(link.value % 5) * 0.5}s`,
                    }}
                  />
                )}
              </g>
            ))}
          </g>

          <g className="flowviz__nodes">
            {model.nodes.map((node) => (
              <g
                key={node.id}
                className={`flowviz__node ${isNodeDimmed(node) ? "is-dimmed" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`${node.name}, ${node.value} sessions`}
                onMouseEnter={() => setFocused(node.id)}
                onMouseLeave={() => setFocused(null)}
                onFocus={() => setFocused(node.id)}
                onBlur={() => setFocused(null)}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={node.height}
                  rx="3"
                  className="flowviz__bar"
                />
                <text
                  x={node.x + NODE_WIDTH + 10}
                  y={node.y + node.height / 2}
                  className="flowviz__label"
                  dominantBaseline="middle"
                >
                  {node.name}
                  <tspan className="flowviz__count" dx="8">{node.value}</tspan>
                </text>
              </g>
            ))}
          </g>
        </g>

        <g className="flowviz__headers">
          {model.columns.map((column) => (
            <text key={column.label} x={column.x} y="12" className="flowviz__header">
              {column.label}
            </text>
          ))}
        </g>
      </svg>

      <table className="visually-hidden">
        <caption>Visitor journey transitions</caption>
        <thead>
          <tr>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {model.links.map((link) => (
            <tr key={link.id}>
              <th scope="row">{link.fromId.split(":").slice(1).join(":")}</th>
              <td>{link.toId.split(":").slice(1).join(":")}</td>
              <td>{link.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
