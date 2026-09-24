/**
 * Unit tests for the pure classification and validation layer.
 *
 * These need no database. They cover the boundary where untrusted browser input
 * is turned into something storable, which is where a mistake would be both
 * easy to make and expensive.
 */

import { describe, it, expect } from "vitest";
import { normalisePath, cleanText, pageViewSchema, eventSchema, rangeSchema } from "../src/utils/validate";
import { classify } from "../src/services/userAgent";
import { attribute } from "../src/services/referrer";

describe("normalisePath", () => {
  it("accepts an ordinary internal path", () => {
    expect(normalisePath("/projects")).toBe("/projects");
  });

  it("strips the query string, which is where stray personal data ends up", () => {
    expect(normalisePath("/projects?email=someone@example.com")).toBe("/projects");
  });

  it("strips the fragment", () => {
    expect(normalisePath("/lab#findings")).toBe("/lab");
  });

  it("collapses a trailing slash so one page is not counted as two", () => {
    expect(normalisePath("/projects/")).toBe("/projects");
    expect(normalisePath("/")).toBe("/");
  });

  it("rejects an absolute URL, so a third party cannot inject into top-pages", () => {
    expect(normalisePath("https://evil.example/pwned")).toBeNull();
  });

  it("rejects a protocol-relative URL", () => {
    expect(normalisePath("//evil.example/pwned")).toBeNull();
  });

  it("rejects a path containing control characters", () => {
    expect(normalisePath(`/proj${String.fromCharCode(0)}ects`)).toBeNull();
    expect(normalisePath("/proj\nects")).toBeNull();
  });

  it("rejects an over-long path rather than silently truncating it", () => {
    expect(normalisePath(`/${"a".repeat(600)}`)).toBeNull();
  });

  it("rejects non-strings and empties", () => {
    expect(normalisePath(null)).toBeNull();
    expect(normalisePath(42)).toBeNull();
    expect(normalisePath("")).toBeNull();
    expect(normalisePath("no-leading-slash")).toBeNull();
  });
});

describe("cleanText", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanText("  Threat   Scope \n", 100)).toBe("Threat Scope");
  });

  it("bounds the length", () => {
    expect(cleanText("x".repeat(500), 10)).toHaveLength(10);
  });

  it("returns null for an effectively empty value", () => {
    expect(cleanText("   ", 10)).toBeNull();
  });
});

describe("pageViewSchema", () => {
  it("normalises a valid payload", () => {
    const result = pageViewSchema.safeParse({
      path: "/projects/threatscope?ref=x",
      title: "  ThreatScope  ",
    });
    expect(result.success).toBe(true);
    expect(result.data.path).toBe("/projects/threatscope");
    expect(result.data.title).toBe("ThreatScope");
  });

  it("rejects a payload whose path is not an internal path", () => {
    expect(pageViewSchema.safeParse({ path: "https://evil.example" }).success).toBe(false);
  });
});

describe("eventSchema", () => {
  it("accepts a known event type with flat metadata", () => {
    const result = eventSchema.safeParse({
      type: "github_click",
      path: "/projects",
      data: { host: "github.com" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown event type instead of storing arbitrary strings", () => {
    expect(eventSchema.safeParse({ type: "arbitrary_type" }).success).toBe(false);
  });

  it("rejects metadata with too many keys", () => {
    const data = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, "v"]));
    expect(eventSchema.safeParse({ type: "cta_click", data }).success).toBe(false);
  });

  it("rejects nested metadata, which would allow unbounded JSONB", () => {
    expect(
      eventSchema.safeParse({ type: "cta_click", data: { nested: { deep: true } } }).success
    ).toBe(false);
  });
});

describe("rangeSchema", () => {
  it("applies defaults", () => {
    expect(rangeSchema.parse({})).toEqual({ days: 30, limit: 10 });
  });

  it("bounds days so one request cannot scan unbounded history", () => {
    expect(rangeSchema.safeParse({ days: 5000 }).success).toBe(false);
    expect(rangeSchema.safeParse({ days: 0 }).success).toBe(false);
  });

  it("rejects a non-numeric range", () => {
    expect(rangeSchema.safeParse({ days: "'; DROP TABLE sessions; --" }).success).toBe(false);
  });
});

describe("user agent classification", () => {
  it("classifies a desktop browser into families without versions", () => {
    const result = classify(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
    );
    expect(result).toMatchObject({ deviceCategory: "desktop", browserFamily: "Chrome", osFamily: "Windows", isBot: false });
    // No version digits should survive into stored values.
    expect(result.browserFamily).not.toMatch(/\d/);
  });

  it("classifies a phone as mobile", () => {
    const result = classify(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
    );
    expect(result.deviceCategory).toBe("mobile");
    expect(result.osFamily).toBe("iOS");
    expect(result.isBot).toBe(false);
  });

  it("flags known crawlers so they stay out of reported figures", () => {
    for (const ua of [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "Mozilla/5.0 (compatible; LinkedInBot/1.0)",
    ]) {
      expect(classify(ua).isBot, ua).toBe(true);
    }
  });

  it("treats a missing user agent as a bot", () => {
    expect(classify(undefined).isBot).toBe(true);
    expect(classify("").isBot).toBe(true);
  });
});

describe("referrer attribution", () => {
  it("returns direct when no referrer is supplied", () => {
    expect(attribute(null)).toMatchObject({ source: "direct", host: null });
    expect(attribute("")).toMatchObject({ source: "direct" });
  });

  it("buckets the major sources", () => {
    expect(attribute("https://www.google.com/search").source).toBe("google");
    expect(attribute("https://www.linkedin.com/feed/").source).toBe("linkedin");
    expect(attribute("https://github.com/someone").source).toBe("github");
    expect(attribute("https://duckduckgo.com/").source).toBe("search");
  });

  it("falls back to referral for an unrecognised host", () => {
    const result = attribute("https://someblog.example/post");
    expect(result.source).toBe("referral");
    expect(result.host).toBe("someblog.example");
  });

  it("discards the query string from the stored referrer URL", () => {
    const result = attribute("https://someblog.example/post?utm_source=newsletter&q=secret");
    expect(result.url).toBe("https://someblog.example/post");
    expect(result.url).not.toContain("secret");
  });

  it("does not treat a malformed referrer as a crash", () => {
    expect(attribute("not a url").source).toBe("other");
    expect(attribute("javascript:alert(1)").source).toBe("other");
  });
});
