/**
 * Analytics disclosure.
 *
 * Deliberately NOT a consent wall.
 *
 * The reasoning: this site sets one first-party cookie holding a random
 * identifier used only to count visits to this site. It runs no third-party
 * script, shares nothing with anyone, and builds no cross-site profile. A modal
 * that blocks the page to extract a click for that is theatre — and the
 * "Accept all" / greyed-out "Manage preferences" pattern is exactly the dark
 * pattern the design brief rules out.
 *
 * So: a quiet, dismissible strip that states plainly what is collected, links
 * to the full detail, and offers a genuine one-click opt-out that actually
 * clears the identifier server-side. Dismissing it does not grant consent to
 * anything, because nothing further is being asked for.
 *
 * NOTE ON JURISDICTION: whether a prior-consent banner is legally required for
 * first-party analytics depends on where the site is operated and who visits.
 * This is a design and transparency decision, not legal advice, and /privacy
 * says so explicitly.
 *
 * Dismissal is stored in localStorage rather than a cookie: it is a purely
 * cosmetic per-browser preference, it is never read by the server, and keeping
 * it out of cookies means it is not sent on a single request.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { analytics } from "../lib/analytics.js";
import { EASE } from "../lib/motion.js";

const STORAGE_KEY = "portfolio.notice.dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode, blocked storage. Show the notice; it is not important
    // enough to warrant any fallback.
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function AnalyticsNotice() {
  const [visible, setVisible] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    if (readDismissed()) return undefined;
    // Delay so it does not compete with the hero entrance for attention.
    const timer = window.setTimeout(() => setVisible(true), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    writeDismissed();
    setVisible(false);
  };

  const optOut = async () => {
    await analytics.optOut();
    setOptedOut(true);
    writeDismissed();
    window.setTimeout(() => setVisible(false), 2200);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          className="notice"
          role="region"
          aria-label="Analytics notice"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {optedOut ? (
            <p className="notice__text">
              <strong>Opted out.</strong> Your identifier has been cleared and nothing further will
              be recorded.
            </p>
          ) : (
            <>
              <div className="notice__body">
                <p className="notice__text">
                  This site uses its own analytics — one first-party cookie holding a random
                  identifier, so visits can be counted. No third-party trackers, no profiling,
                  nothing shared.
                </p>
                <Link to="/privacy" className="notice__link">
                  What is collected →
                </Link>
              </div>
              <div className="notice__actions">
                <button type="button" className="btn btn--secondary btn--small" onClick={optOut}>
                  Opt out
                </button>
                <button type="button" className="btn btn--small" onClick={dismiss}>
                  Got it
                </button>
              </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
