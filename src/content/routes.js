/**
 * Canonical route list.
 *
 * Shared by the sitemap generator and the test suite. Detail pages for projects
 * and labs are included explicitly rather than globbed, so a route cannot drift
 * into the sitemap before it exists.
 */

const SITE_ROUTES = [
  { path: "/",                          indexable: true,  changefreq: "weekly",  priority: "1.0" },
  { path: "/about",                     indexable: true,  changefreq: "monthly", priority: "0.8" },
  { path: "/experience",                indexable: true,  changefreq: "monthly", priority: "0.8" },
  { path: "/projects",                  indexable: true,  changefreq: "weekly",  priority: "0.9" },
  { path: "/projects/phishsafe",        indexable: true,  changefreq: "monthly", priority: "0.9" },
  { path: "/projects/network-intrusion-detection", indexable: true, changefreq: "monthly", priority: "0.9" },
  { path: "/projects/splunk-soc-lab",    indexable: true,  changefreq: "monthly", priority: "0.9" },
  { path: "/projects/sysmon-reconnaissance-detection", indexable: true, changefreq: "monthly", priority: "0.9" },
  { path: "/projects/threatscope",      indexable: true,  changefreq: "monthly", priority: "0.9" },
  { path: "/projects/portfolio-analytics", indexable: true, changefreq: "monthly", priority: "0.8" },
  { path: "/lab",                       indexable: true,  changefreq: "weekly",  priority: "0.9" },
  { path: "/lab/session-cookie-security", indexable: true, changefreq: "monthly", priority: "0.7" },
  { path: "/lab/security-headers",      indexable: true,  changefreq: "monthly", priority: "0.7" },
  { path: "/lab/authentication-hardening", indexable: true, changefreq: "monthly", priority: "0.7" },
  { path: "/skills",                    indexable: true,  changefreq: "monthly", priority: "0.7" },
  { path: "/certifications",            indexable: true,  changefreq: "monthly", priority: "0.6" },
  { path: "/education",                 indexable: true,  changefreq: "monthly", priority: "0.6" },
  { path: "/contact",                   indexable: true,  changefreq: "monthly", priority: "0.8" },
  { path: "/privacy",                   indexable: true,  changefreq: "yearly",  priority: "0.4" },
  // Excluded from the sitemap: private console and its login screen.
  { path: "/admin",                     indexable: false, changefreq: "never",   priority: "0.0" },
];

module.exports = { SITE_ROUTES };
