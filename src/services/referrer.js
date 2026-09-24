/**
 * Referrer normalisation and traffic-source attribution.
 *
 * Two deliberate limits on certainty:
 *
 * 1. Query strings are stripped before storage. A referrer URL's query tail can
 *    carry search terms and campaign identifiers that we have no use for and no
 *    business retaining.
 * 2. Browsers send referrers under a `strict-origin-when-cross-origin` default,
 *    so a cross-site referrer is usually only an origin, and apps such as
 *    LinkedIn and Slack often send nothing at all. "Direct" therefore means
 *    "no referrer was supplied", which is not the same as "typed the URL in".
 *    The dashboard labels it accordingly rather than overclaiming.
 */

const { config } = require("../config");

/** host suffix -> attribution bucket */
const SOURCE_MAP = [
  [["google.", "googleusercontent.", "googleweblight."], "google"],
  [["linkedin.", "lnkd.in"], "linkedin"],
  [["github.", "github.io", "githubusercontent."], "github"],
  [["bing.", "duckduckgo.", "search.yahoo.", "ecosia.", "startpage.", "brave.com", "baidu.", "yandex."], "search"],
  [["x.com", "twitter.", "t.co"], "x"],
  [["reddit.", "redd.it"], "reddit"],
  [["youtube.", "youtu.be"], "youtube"],
  [["facebook.", "instagram.", "fb.com"], "social"],
  [["mail.google.", "outlook.", "mail.yahoo."], "email"],
];

function siteHost() {
  try {
    return new URL(config.siteUrl).hostname.replace(/^www\./, "");
  } catch {
    return "localhost";
  }
}

/**
 * @param {string|undefined|null} referrer  Raw Referer header or document.referrer
 * @returns {{ source: string, host: string|null, url: string|null }}
 */
function attribute(referrer) {
  if (!referrer || typeof referrer !== "string" || referrer.trim() === "") {
    return { source: "direct", host: null, url: null };
  }

  let parsed;
  try {
    parsed = new URL(referrer.trim());
  } catch {
    return { source: "other", host: null, url: null };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { source: "other", host: null, url: null };
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  // Navigation within the portfolio itself is not an acquisition source. It is
  // recorded as `internal` so it can be excluded from the sources chart while
  // remaining visible in flow analysis.
  if (host === siteHost() || host === "localhost" || host === "127.0.0.1") {
    return { source: "internal", host, url: null };
  }

  const match = SOURCE_MAP.find(([suffixes]) =>
    suffixes.some((suffix) => host === suffix.replace(/\.$/, "") || host.endsWith(suffix) || host.startsWith(suffix))
  );

  return {
    source: match ? match[1] : "referral",
    host: host.slice(0, 160),
    // Path is kept because it is genuinely useful ("which blog linked to me")
    // but the query string is discarded.
    url: `${parsed.origin}${parsed.pathname}`.slice(0, 400),
  };
}

/** Human-readable label for a bucket, used by the dashboard and AI prompt. */
const SOURCE_LABELS = {
  direct: "Direct / unknown",
  google: "Google",
  linkedin: "LinkedIn",
  github: "GitHub",
  search: "Other search",
  x: "X",
  reddit: "Reddit",
  youtube: "YouTube",
  social: "Social",
  email: "Email",
  referral: "Referral",
  internal: "Internal",
  other: "Other",
};

module.exports = { attribute, SOURCE_LABELS };
