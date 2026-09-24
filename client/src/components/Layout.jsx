/**
 * Public site shell: navigation, page transition, footer, analytics notice.
 *
 * Also owns two cross-cutting behaviours that belong in exactly one place:
 * scroll restoration on navigation, and reporting the page view.
 */

import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "./Nav.jsx";
import { Footer } from "./Footer.jsx";
import { AnalyticsNotice } from "./AnalyticsNotice.jsx";
import { analytics } from "../lib/analytics.js";
import { EASE, prefersReducedMotion } from "../lib/motion.js";

/**
 * Report the page view after the route has painted.
 *
 * The rAF defer matters: React 19 hoists the route's <title> during commit, so
 * reading document.title synchronously in the effect can capture the *previous*
 * page's title. One frame later it is correct.
 */
function usePageViewTracking() {
  const location = useLocation();
  const lastReported = useRef(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastReported.current === path) return undefined;
    lastReported.current = path;

    const frame = window.requestAnimationFrame(() => {
      analytics.trackPageView(path, document.title);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);
}

/** Scroll to top on navigation, but respect in-page anchors and back/forward. */
function useScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
}

export function Layout() {
  const location = useLocation();
  usePageViewTracking();
  useScrollRestoration();

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav />

      {/*
        Page transition. Kept very short (180ms) and opacity-only: a route
        change must never make the visitor wait on an animation.

        No `mode` is set deliberately. `mode="wait"` doubles the delay by
        holding the incoming page until the outgoing one has finished leaving.
        `mode="popLayout"` takes over the outgoing child's layout and drives it
        through `flushSync`, which is a fragile path to be on with React 19 and
        bought nothing here — the transition is a plain opacity crossfade with
        no layout involved. The default mode simply overlaps the two elements
        for 180ms, which is exactly what a crossfade wants.
      */}
      <AnimatePresence initial={false}>
        <motion.main
          id="main"
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          {/*
            The lazy-chunk boundary lives here, around the routed content only,
            so the navigation and footer stay mounted while a chunk loads.
          */}
          <Suspense fallback={<div className="route-loading" role="status" aria-label="Loading" />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <Footer />
      <AnalyticsNotice />
    </>
  );
}
