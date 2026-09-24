/**
 * User-Agent classification.
 *
 * Reduces a User-Agent string to three coarse buckets and a bot flag, then
 * throws the string away. The raw UA never reaches the database (see migration
 * 002). We keep families without versions: "Chrome", not "Chrome 141.0.7390.55".
 * Version strings add entropy that is useful for fingerprinting and useless for
 * answering the only question the dashboard asks, which is "roughly what are
 * people browsing with".
 */

const { UAParser } = require("ua-parser-js");

/**
 * Conservative bot detection. The aim is to keep obvious crawlers, uptime
 * checks and link unfurlers out of the reported human figures. It will not
 * catch a headless browser pretending to be Chrome, and it is not trying to:
 * this is data hygiene, not bot defence.
 */
const BOT_PATTERN =
  /bot|crawler|spider|crawl|slurp|search|fetch|monitor|uptime|curl|wget|python-requests|axios|node-fetch|headless|phantom|lighthouse|pagespeed|preview|scrap|facebookexternalhit|whatsapp|telegram|discord|slackbot|linkedinbot|twitterbot|embedly|pingdom|semrush|ahrefs|dataprovider|go-http-client|okhttp|java\//i;

/** Normalises the wide set of ua-parser device types into four buckets. */
function toDeviceCategory(deviceType) {
  switch (deviceType) {
    case "mobile":
      return "mobile";
    case "tablet":
      return "tablet";
    case "console":
    case "smarttv":
    case "wearable":
    case "embedded":
      return "unknown";
    // ua-parser leaves `type` undefined for ordinary desktop browsers.
    case undefined:
      return "desktop";
    default:
      return "unknown";
  }
}

/** Strips a version tail so "Chrome WebView 141" collapses to a family name. */
function familyOnly(name) {
  if (!name) return null;
  return String(name).replace(/\s*\d[\d._]*$/, "").trim().slice(0, 48) || null;
}

/**
 * @param {string|undefined} userAgent
 * @returns {{ deviceCategory: string, browserFamily: string|null, osFamily: string|null, isBot: boolean }}
 */
function classify(userAgent) {
  if (!userAgent || typeof userAgent !== "string") {
    // A request with no User-Agent at all is almost never a real browser.
    return { deviceCategory: "unknown", browserFamily: null, osFamily: null, isBot: true };
  }

  if (BOT_PATTERN.test(userAgent)) {
    return { deviceCategory: "unknown", browserFamily: null, osFamily: null, isBot: true };
  }

  // Cap the input: ua-parser runs a set of regexes, and an absurdly long
  // attacker-supplied header should not become CPU time.
  const parsed = new UAParser(userAgent.slice(0, 512)).getResult();

  return {
    deviceCategory: toDeviceCategory(parsed.device.type),
    browserFamily: familyOnly(parsed.browser.name),
    osFamily: familyOnly(parsed.os.name),
    isBot: false,
  };
}

module.exports = { classify, BOT_PATTERN };
