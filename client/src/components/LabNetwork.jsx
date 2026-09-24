/**
 * Cyber Lab header graphic: a static network topology in SVG with a scanning
 * sweep travelling across it.
 *
 * SVG rather than canvas here because the topology is fixed and hand-placed —
 * there is no simulation to run, so there is no reason to burn a rAF loop. The
 * sweep and the node pulses are pure CSS animations, which the browser can run
 * off the main thread entirely.
 *
 * Intended to read as a network diagram on an engineer's screen, not a game.
 * Low contrast, slow, and behind the text at all times.
 */

const NODES = [
  { id: "a", x: 8, y: 52, r: 4, hot: false },
  { id: "b", x: 24, y: 24, r: 3, hot: true },
  { id: "c", x: 26, y: 74, r: 3, hot: false },
  { id: "d", x: 44, y: 44, r: 5, hot: true },
  { id: "e", x: 47, y: 86, r: 3, hot: false },
  { id: "f", x: 63, y: 20, r: 3, hot: false },
  { id: "g", x: 68, y: 62, r: 4, hot: true },
  { id: "h", x: 84, y: 38, r: 3, hot: false },
  { id: "i", x: 92, y: 72, r: 3, hot: false },
];

const LINKS = [
  ["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"], ["c", "e"],
  ["d", "f"], ["d", "g"], ["e", "g"], ["f", "h"], ["g", "h"], ["g", "i"], ["h", "i"],
];

const byId = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function LabNetwork() {
  return (
    <svg
      className="lab-network"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The scanning sweep: a narrow yellow band translated across the
            viewBox by a CSS animation on the <g> that carries it. */}
        <linearGradient id="lab-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,200,0,0)" />
          <stop offset="45%" stopColor="rgba(255,200,0,0.30)" />
          <stop offset="55%" stopColor="rgba(255,200,0,0.30)" />
          <stop offset="100%" stopColor="rgba(255,200,0,0)" />
        </linearGradient>
      </defs>

      <g className="lab-network__links">
        {LINKS.map(([from, to]) => {
          const a = byId[from];
          const b = byId[to];
          const hot = a.hot && b.hot;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={hot ? "rgba(255,200,0,0.45)" : "rgba(16,17,20,0.10)"}
              strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>

      <g className="lab-network__nodes">
        {NODES.map((node, index) => (
          <g key={node.id}>
            {node.hot && (
              <circle
                className="lab-network__pulse"
                cx={node.x}
                cy={node.y}
                r={node.r}
                style={{ animationDelay: `${index * 0.6}s` }}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r * 0.32}
              fill={node.hot ? "rgba(255,200,0,0.95)" : "rgba(16,17,20,0.22)"}
            />
          </g>
        ))}
      </g>

      <rect className="lab-network__sweep" x="-40" y="0" width="40" height="100" fill="url(#lab-sweep)" />
    </svg>
  );
}
