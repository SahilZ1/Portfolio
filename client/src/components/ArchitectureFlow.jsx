/**
 * Architecture flow diagram.
 *
 * A horizontal (vertical on narrow screens) chain of labelled stages with a
 * yellow pulse travelling along the connectors.
 *
 * Built from DOM elements and CSS rather than SVG so the labels wrap and
 * reflow naturally at any length — an SVG version would need text measurement
 * to avoid overflowing at mobile widths. The travelling pulse is a single CSS
 * animation on a pseudo-element, so it costs nothing per stage.
 *
 * The whole diagram is decorative reinforcement: the same sequence is present
 * as an ordered list in the markup, so a screen reader gets the information in
 * a usable form and nothing depends on seeing the animation.
 */

import { motion } from "framer-motion";
import { isTodo } from "../content/site.js";
import { Todo } from "./Todo.jsx";
import { EASE, VIEWPORT, prefersReducedMotion } from "../lib/motion.js";

export function ArchitectureFlow({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const reduced = prefersReducedMotion();
  const allPlaceholders = steps.every(isTodo);

  if (allPlaceholders) {
    return (
      <div className="flow flow--empty">
        <Todo hint="Define the architecture stages in content/projects.js" />
      </div>
    );
  }

  return (
    <motion.ol
      className={`flow ${reduced ? "flow--static" : ""}`}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduced ? 0 : 0.09 } },
      }}
    >
      {steps.map((step, index) => (
        <motion.li
          key={index}
          className="flow__step"
          variants={{
            hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
          }}
        >
          <span className="flow__node">
            <span className="flow__index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flow__label">
              {isTodo(step) ? <Todo hint={step.hint} /> : step}
            </span>
          </span>

          {index < steps.length - 1 && (
            <span className="flow__connector" aria-hidden="true">
              <span className="flow__pulse" style={{ animationDelay: `${index * 0.45}s` }} />
            </span>
          )}
        </motion.li>
      ))}
    </motion.ol>
  );
}
