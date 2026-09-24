/**
 * First-party analytics client.
 *
 * Posts page views and events to the site's own API. There is no third-party
 * script, no external request, and nothing here reads or writes browser storage
 * of any kind.
 *
 * What this file deliberately does NOT do
 * ---------------------------------------
 * No canvas or WebGL fingerprinting. No font or plugin enumeration. No screen
 * or hardware probing. No reading of any cookie -- the visitor identifier is
 * HttpOnly and travels automatically with `credentials: "same-origin"`, so this
 * code never sees it and an XSS payload could not extract it from here either.
 * No localStorage, no sessionStorage, no IndexedDB.
 *
 * Everything sent is listed explicitly in the payloads below: a path, a page
 * title, the referrer at first load, and for events a type plus a small flat
 * metadata object.
 */

const ENDPOINT = "/api/track";

/**
 * Global kill switch, honoured before any network call.
 *
 * Set when the visitor opts out on /privacy, and when the browser sends Do Not
 * Track. DNT is widely ignored by commercial analytics; honouring it costs one
 * condition and is the whole point of building this in-house.
 */
let disabled = false;

function shouldTrack() {
  if (disabled) return false;
  if (typeof navigator === "undefined") return false;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return false;
  if (navigator.globalPrivacyControl === true) return false;
  return true;
}

function disable() {
  disabled = true;
}

/**
 * Fire-and-forget POST.
 *
 * `keepalive` lets a request outlive the page, which matters for the outbound
 * click that is about to navigate away. Failures are swallowed entirely: a
 * blocked request, an offline device or a 500 must never produce a console
 * error on a recruiter's screen, and there is nothing useful the page could do
 * about it anyway.
 */
async function send(path, body) {
  if (!shouldTrack()) return;
  try {
    await fetch(`${ENDPOINT}${path}`, {
      method: "POST",
      // Sends the HttpOnly visitor cookie on same-origin requests. Nothing is
      // read from it here; the server resolves the identity.
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* analytics must never surface to the visitor */
  }
}

/**
 * De-duplication.
 *
 * React StrictMode double-invokes effects in development, and a router can
 * report the same location twice during a transition. Without this guard the
 * first page of every session would be counted twice. Keyed on path so a genuine
 * revisit later in the session (Home -> Projects -> Home) is still recorded.
 */
let lastPath = null;
let lastPathAt = 0;
const DEDUPE_WINDOW_MS = 900;

function trackPageView(path, title) {
  const now = Date.now();
  if (path === lastPath && now - lastPathAt < DEDUPE_WINDOW_MS) return;
  lastPath = path;
  lastPathAt = now;

  send("/pageview", {
    path,
    title: title ?? document.title ?? null,
    // Only meaningful on the first view of a visit; afterwards it is the
    // previous internal page, which the server classifies as `internal`.
    referrer: document.referrer || null,
  });
}

/**
 * @param {string} type  must be one of the types the server allows; anything
 *                       else is rejected server-side rather than stored.
 * @param {object} [data] flat metadata, at most 12 primitive keys.
 */
function trackEvent(type, data = {}, path = window.location.pathname) {
  send("/event", { type, path, data });
}

/** Clears the visitor cookie server-side and stops all further tracking. */
async function optOut() {
  try {
    await fetch(`${ENDPOINT}/opt-out`, { method: "POST", credentials: "same-origin" });
  } catch {
    /* ignore */
  }
  disable();
}

/**
 * Classify a link and record the click.
 *
 * Only the destination *hostname* is recorded, never the full URL: knowing that
 * someone opened GitHub is a useful signal, and the specific repository path
 * adds nothing the dashboard needs.
 */
function trackOutbound(href, context = {}) {
  let host;
  try {
    host = new URL(href, window.location.origin).hostname.replace(/^www\./, "");
  } catch {
    return;
  }
  if (host === window.location.hostname) return; // internal link

  const type = host.endsWith("github.com") ? "github_click" : "external_link_click";
  trackEvent(type, { host, ...context });
}

export const analytics = {
  trackPageView,
  trackEvent,
  trackOutbound,
  optOut,
  disable,
  get enabled() {
    return shouldTrack();
  },
};
