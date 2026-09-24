/**
 * SEO endpoints served by Express rather than shipped as static files, so the
 * canonical host comes from SITE_URL and the sitemap's lastmod is real.
 */

const express = require("express");
const { config } = require("../config");
const { SITE_ROUTES } = require("../content/routes");

const router = express.Router();

router.get("/robots.txt", (req, res) => {
  // /admin is disallowed as a courtesy to well-behaved crawlers. It is not a
  // security control -- the console is protected by authentication, and robots
  // .txt is a public file that would merely advertise the path to anyone else.
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "",
    `Sitemap: ${config.siteUrl}/sitemap.xml`,
    "",
  ].join("\n");

  res.type("text/plain").set("Cache-Control", "public, max-age=86400").send(body);
});

router.get("/sitemap.xml", (req, res) => {
  const urls = SITE_ROUTES.filter((route) => route.indexable)
    .map(
      (route) => `  <url>
    <loc>${config.siteUrl}${route.path === "/" ? "" : route.path}/</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(xml);
});

module.exports = router;
