/**
 * Site-wide content and identity.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDERS
 * ---------------------------------------------------------------------------
 * Anything marked with `TODO(` is a value that was not known when this site was
 * built and must be filled in by the site owner. Nothing about Sahil's history,
 * employers, dates, grades, certifications or metrics has been invented.
 *
 * Placeholders render with a visible dashed outline on the page (see the
 * `.todo` style) so they are impossible to ship by accident. Search the repo
 * for `TODO(` to find every one of them.
 * ---------------------------------------------------------------------------
 */

/** Marks a value as an unfilled placeholder. */
export const TODO = (hint) => ({ __todo: true, hint });

export const isTodo = (value) => Boolean(value && typeof value === "object" && value.__todo);

export const site = {
  name: "Sahil Zagade",
  firstName: "Sahil",
  lastName: "Zagade",

  /** Shown under the name in the hero, revealed one at a time. */
  disciplines: ["Cyber Security", "Cloud", "Detection Engineering"],

  /** The one-line positioning statement. */
  statement: "I build, secure and analyse systems.",

  /**
   * Hero supporting paragraph. Describes what this site demonstrably is, which
   * is verifiable by anyone reading the source — no claims beyond that.
   */
  intro:
    "Cyber security analyst intern at AIIDA and final-year Computing Science (Honours) student at UTS, working across SOC operations, threat detection and cloud security. This site is the evidence: it runs on an Express and PostgreSQL backend I wrote, with a first-party analytics platform behind it — anonymous visitor tracking, session reconstruction, traffic-flow analysis and a private console — designed with the privacy and hardening decisions documented in the open.",

  location: "Sydney, NSW, Australia",
  availability:
    "Final-year student at UTS, open to graduate cyber security and SOC analyst roles in Sydney.",

  links: {
    github: "https://github.com/SahilZ1",
    linkedin: "https://www.linkedin.com/in/sahil-zagade-03a874258",
    email: "sahil.zagade21@gmail.com",
    resume: "/Sahil-Zagade-Resume.docx",
  },

  seo: {
    titleTemplate: "%s · Sahil Zagade",
    defaultTitle: "Sahil Zagade · Cyber Security Analyst",
    description:
      "Portfolio of Sahil Zagade — cyber security analyst in Sydney. SOC operations, threat detection and cloud security, with SIEM and endpoint detection projects, a hands-on Cyber Lab and a custom-built first-party analytics platform.",
    /**
     * Deployed origin, used for canonical URLs and OpenGraph.
     *
     * This is the project's stable Vercel alias, which survives redeploys —
     * not a per-deployment hostname, which would go stale on the next push.
     * Replace it with a custom domain if one is ever added.
     */
    siteUrl: "https://portfolio-self-a6da.vercel.app",
  },
};

/** Primary navigation. Order is the order shown. */
export const navigation = [
  { label: "About", path: "/about" },
  { label: "Experience", path: "/experience" },
  { label: "Projects", path: "/projects" },
  { label: "Cyber Lab", path: "/lab" },
  { label: "Skills", path: "/skills" },
  { label: "Contact", path: "/contact" },
];

/** Secondary links, shown in the footer only. */
export const footerNavigation = [
  { label: "Certifications", path: "/certifications" },
  { label: "Education", path: "/education" },
  { label: "Privacy & analytics", path: "/privacy" },
];
