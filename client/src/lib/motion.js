/**
 * Shared motion configuration.
 *
 * One easing curve and one set of durations for the whole site. Animation that
 * feels designed rather than assembled is mostly a matter of every element
 * moving with the same physics.
 *
 * Reduced motion is handled at the source: `variants()` returns opacity-only
 * variants when the preference is set, so components do not each need to branch.
 * The result is a still, fully usable page rather than a fast-but-still-moving
 * one, which is what the preference actually asks for.
 */

import { useEffect, useState } from "react";

export const EASE = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.18,
  base: 0.42,
  slow: 0.7,
};

/** True when the visitor has asked for reduced motion. */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reactive version, so a change to the OS setting takes effect immediately. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** True on a device without a precise, hovering pointer — i.e. touch. */
export function useIsTouch() {
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setTouch(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return touch;
}

/**
 * Entrance variants.
 *
 * Only `opacity` and `transform` are animated. Both are handled by the
 * compositor, so they do not trigger layout or paint and hold 60fps on a
 * mid-range phone. Animating height, top or margin instead is the usual reason
 * scroll animations stutter.
 */
export function fadeUp(distance = 18, delay = 0) {
  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.001, delay: 0 } },
    };
  }
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.base, ease: EASE, delay },
    },
  };
}

/** Container that reveals its children one after another. */
export function stagger(gap = 0.07, delayChildren = 0) {
  if (prefersReducedMotion()) {
    return { hidden: {}, visible: { transition: { staggerChildren: 0, delayChildren: 0 } } };
  }
  return {
    hidden: {},
    visible: { transition: { staggerChildren: gap, delayChildren } },
  };
}

/**
 * Viewport settings for scroll-triggered reveals.
 *
 * `once: true` is the important one: without it, an element replays its
 * entrance every time it re-enters the viewport, so small scroll adjustments
 * make the page flicker. An entrance should happen once.
 *
 * The negative bottom margin delays the trigger until the element is properly
 * on screen rather than just clipping the edge.
 */
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px", amount: 0.15 };
