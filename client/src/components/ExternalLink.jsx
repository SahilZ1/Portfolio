/**
 * Outbound link.
 *
 * Two jobs, both easy to forget when writing an <a> by hand:
 *
 * 1. `rel="noopener noreferrer"` with `target="_blank"`. Without `noopener`,
 *    the opened page receives a `window.opener` reference back to this one and
 *    can navigate it somewhere else — reverse tabnabbing. `noreferrer` stops
 *    our URL appearing in the destination's referrer logs.
 *
 * 2. Records the click, sending only the destination hostname. `keepalive` on
 *    the underlying request is what lets it survive the navigation.
 */

import { analytics } from "../lib/analytics.js";

export function ExternalLink({ href, children, className, context, ...rest }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => analytics.trackOutbound(href, context)}
      {...rest}
    >
      {children}
    </a>
  );
}
