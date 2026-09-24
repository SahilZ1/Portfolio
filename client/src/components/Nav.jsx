/**
 * Primary navigation.
 *
 * Behaviour:
 *  - The active link is marked by a yellow underline that slides between items
 *    using a shared `layoutId`, so the indicator travels rather than jumping.
 *  - The bar gains a background and border once the page is scrolled, so it
 *    stays legible over the hero without sitting on a permanent slab.
 *  - The mobile menu is a real dialog: focus is trapped by inert-ing the rest
 *    of the page, Escape closes it, and body scroll is locked while open.
 */

import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { navigation, site } from "../content/site.js";
import { EASE } from "../lib/motion.js";

function Logo() {
  return (
    <Link to="/" className="nav__logo" aria-label={`${site.name} — home`}>
      <span className="nav__logo-mark" aria-hidden="true" />
      <span className="nav__logo-text">
        <span className="nav__logo-first">{site.firstName}</span>
        <span className="nav__logo-last">{site.lastName}</span>
      </span>
    </Link>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef(null);

  // Scroll state drives the bar's appearance. Passive listener so it never
  // blocks scrolling, and the state only flips at the threshold rather than
  // setting state on every frame.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes the menu, including back/forward.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // While the menu is open: lock background scroll and close on Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        // Return focus to the control that opened the menu, so keyboard users
        // are not dropped at the top of the document.
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav__inner shell shell--wide">
        <Logo />

        <nav className="nav__links" aria-label="Primary">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span
                      className="nav__indicator"
                      // Shared id: Framer animates the underline between links
                      // instead of removing and re-adding it.
                      layoutId="nav-indicator"
                      transition={{ duration: 0.32, ease: EASE }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="nav__actions">
          <Link to="/contact" className="btn btn--small nav__cta">
            Get in touch
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className="nav__toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="visually-hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
            <span className={`nav__burger ${menuOpen ? "is-open" : ""}`} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="nav__mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <nav aria-label="Mobile">
              <ul className="nav__mobile-list">
                {[...navigation, { label: "Privacy & analytics", path: "/privacy" }].map((item, index) => (
                  <motion.li
                    key={item.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * index, duration: 0.24, ease: EASE }}
                  >
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `nav__mobile-link ${isActive ? "is-active" : ""}`}
                    >
                      {item.label}
                      <span aria-hidden="true">→</span>
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
