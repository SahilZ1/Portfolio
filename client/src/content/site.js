/**
 * Site-wide content and identity.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDERS
 * ---------------------------------------------------------------------------
 * No content file carries a placeholder any more: every value on the site is
 * real. The `TODO` helper and the `.todo` style below are kept as the guard
 * rail they were built to be. Wrapping a value in `TODO("hint")` renders it as
 * a visible dashed outline rather than as text, so a half-written entry is
 * impossible to ship by accident.
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
    "I'm a cyber security analyst intern at AIIDA and a final-year Computing Science (Honours) student at UTS, working across SOC operations, threat detection and cloud security. This site is the evidence. It runs on an Express and PostgreSQL backend I wrote, and the analytics behind it are mine too: anonymous visitor tracking, session reconstruction, traffic-flow analysis and a private console. Every privacy and hardening decision that went into it is documented in the open.",

  location: "Sydney, NSW, Australia",
  phone: "0470 627 048",
  availability:
    "Final-year student at UTS, looking for a junior cyber analyst or backend engineering role in Sydney.",

  links: {
    github: "https://github.com/SahilZ1",
    linkedin: "https://www.linkedin.com/in/sahil-zagade-03a874258",
    email: "sahil.zagade21@gmail.com",
  },

  seo: {
    titleTemplate: "%s · Sahil Zagade",
    defaultTitle: "Sahil Zagade · Cyber Security Analyst",
    description:
      "Portfolio of Sahil Zagade, a cyber security analyst in Sydney working across SOC operations, threat detection and cloud security, with SIEM and endpoint detection projects and a first-party analytics platform built from scratch.",
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
  { label: "Skills", path: "/skills" },
  { label: "Contact", path: "/contact" },
];

/** Secondary links, shown in the footer only. */
export const footerNavigation = [
  { label: "Certifications", path: "/certifications" },
  { label: "Education", path: "/education" },
  { label: "Privacy & analytics", path: "/privacy" },
];
