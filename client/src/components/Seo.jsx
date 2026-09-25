/**
 * Per-route document metadata.
 *
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree into
 * <head>, which means per-route SEO needs no helmet library and no extra
 * dependency. Rendering them from a component also keeps the metadata beside
 * the page it describes.
 *
 * A note on what this does and does not achieve: this is a client-rendered SPA,
 * so a crawler that does not execute JavaScript sees only the shell's default
 * title. Google renders JavaScript and will index these correctly. Link
 * unfurlers that do not (some chat clients) will fall back to the static tags
 * in index.html. For a portfolio of this size that trade is worth avoiding SSR
 * for; if rich per-project link previews become important, prerendering the
 * route set at build time is the next step, not a framework change.
 */

import { isTodo, site } from "../content/site.js";

function canonicalFor(path) {
  const base = isTodo(site.seo.siteUrl) ? null : site.seo.siteUrl.replace(/\/$/, "");
  if (!base) return null;
  return `${base}${path === "/" ? "/" : path}`;
}

export function Seo({ title, description, path = "/", type = "website", noIndex = false }) {
  const fullTitle = title ? site.seo.titleTemplate.replace("%s", title) : site.seo.defaultTitle;
  const desc = description ?? site.seo.description;
  const canonical = canonicalFor(path);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:site_name" content={site.name} />
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </>
  );
}

/**
 * Person structured data, rendered once on the home page.
 * Emitted as JSON-LD in a script tag with type="application/ld+json", which is
 * data rather than executable script and is therefore unaffected by the CSP's
 * script-src restrictions.
 */
export function PersonSchema() {
  const sameAs = [site.links.github, site.links.linkedin].filter((link) => link && !isTodo(link));

  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: "Software Engineer",
    description: site.seo.description,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(isTodo(site.seo.siteUrl) ? {} : { url: site.seo.siteUrl }),
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD must be injected as raw text. The content is built from our own
      // constants above, never from user input, so there is no injection path.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
