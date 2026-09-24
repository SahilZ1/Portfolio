/**
 * Scroll-triggered entrance.
 *
 * Wraps children in a motion element that fades and lifts into place the first
 * time it enters the viewport. `once: true` in VIEWPORT is what stops the
 * animation replaying every time the element scrolls back in — the single most
 * common flaw in scroll-animated sites.
 *
 * Only opacity and transform are animated, so the work stays on the compositor.
 */

import { motion } from "framer-motion";
import { fadeUp, stagger, VIEWPORT } from "../lib/motion.js";

export function Reveal({ children, delay = 0, distance = 18, as = "div", className, ...rest }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      className={className}
      variants={fadeUp(distance, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      {...rest}
    >
      {children}
    </Component>
  );
}

/**
 * Reveals its children in sequence. Children must be `RevealItem` (or any
 * motion element using the `fadeUp` variant names) for the stagger to drive them.
 */
export function RevealGroup({ children, gap = 0.07, delayChildren = 0, as = "div", className, ...rest }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      className={className}
      variants={stagger(gap, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function RevealItem({ children, distance = 16, as = "div", className, ...rest }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component className={className} variants={fadeUp(distance)} {...rest}>
      {children}
    </Component>
  );
}
