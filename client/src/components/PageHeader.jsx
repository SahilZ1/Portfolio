/**
 * Standard page header: eyebrow, title, optional lede.
 * Used by every interior page so the site has one consistent entry rhythm.
 */

import { motion } from "framer-motion";
import { EASE, prefersReducedMotion } from "../lib/motion.js";

export function PageHeader({ eyebrow, title, lede, children }) {
  const reduced = prefersReducedMotion();

  return (
    <header className="page-header">
      <div className="shell shell--wide">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {eyebrow}
        </motion.p>

        <motion.h1
          className="title-xl page-header__title"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.06 }}
        >
          {title}
        </motion.h1>

        {lede && (
          <motion.p
            className="lede page-header__lede"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.14 }}
          >
            {lede}
          </motion.p>
        )}

        {children}
      </div>
    </header>
  );
}
