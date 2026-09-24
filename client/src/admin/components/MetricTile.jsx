/**
 * Metric tile with an animated counter and a period-over-period delta.
 *
 * The counter counts up from zero on mount. It is driven by a single rAF loop
 * that writes to state at most once per frame and stops exactly on the target
 * value — not a setInterval, which drifts and can overshoot.
 *
 * Under prefers-reduced-motion the value is set immediately. An animated number
 * is decorative, and a reader who has asked for stillness should simply see the
 * figure.
 *
 * Delta presentation: for most metrics up is good. For bounce rate it is not,
 * so `invertDelta` flips the colour without flipping the arrow — the arrow
 * describes the direction of the number, the colour describes whether that is
 * welcome.
 */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../lib/motion.js";

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const frameRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic: fast at first, settling into the final value.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target); // land exactly, never on a rounding artefact
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

function Delta({ current, previous, invert }) {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) {
    return current > 0 ? <span className="delta delta--new">new</span> : null;
  }

  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) {
    return <span className="delta delta--flat">no change</span>;
  }

  const rising = change > 0;
  const good = invert ? !rising : rising;

  return (
    <span className={`delta ${good ? "delta--good" : "delta--bad"}`}>
      <span aria-hidden="true">{rising ? "↑" : "↓"}</span>
      {Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}%
      <span className="visually-hidden">
        {rising ? "increase" : "decrease"} on the previous period
      </span>
    </span>
  );
}

export function MetricTile({
  label,
  metric,
  format = (value) => Math.round(value).toLocaleString(),
  suffix,
  invertDelta = false,
  hint,
}) {
  const target = metric?.value ?? 0;
  const animated = useCountUp(target);

  return (
    <div className="tile">
      <p className="tile__label">
        {label}
        {hint && (
          <span className="tile__hint" title={hint} aria-label={hint}>
            ?
          </span>
        )}
      </p>
      <p className="tile__value">
        {format(animated)}
        {suffix && <span className="tile__suffix">{suffix}</span>}
      </p>
      <Delta current={target} previous={metric?.previous} invert={invertDelta} />
    </div>
  );
}
