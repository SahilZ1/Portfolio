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
  disciplines: ["Cybersecurity", "Cloud", "Security Engineering"],

  /** The one-line positioning statement. */
  statement: "I build, secure and analyse systems.",

  /**
   * Hero supporting paragraph. Describes what this site demonstrably is, which
   * is verifiable by anyone reading the source — no claims beyond that.
   */
  intro:
    "This site is the evidence. The portfolio you are reading runs on an Express and PostgreSQL backend I built, with a first-party analytics platform behind it — anonymous visitor tracking, session reconstruction, traffic-flow analysis and a private security console — designed with the privacy and hardening decisions documented in the open.",

  location: TODO("Your city / country, e.g. “Melbourne, Australia”"),
  availability: TODO("e.g. “Open to graduate security engineering roles from July 2026”"),

  links: {
    github: TODO("https://github.com/your-username"),
    linkedin: TODO("https://www.linkedin.com/in/your-profile"),
    email: TODO("your.email@example.com"),
    resume: TODO("/resume.pdf — drop the file in client/public/ and set this to /resume.pdf"),
  },

  seo: {
    titleTemplate: "%s · Sahil Zagade",
    defaultTitle: "Sahil Zagade · Cybersecurity & Security Engineering",
    description:
      "Cybersecurity and security engineering portfolio of Sahil Zagade. Projects, a hands-on Cyber Lab, and a custom-built first-party analytics platform running on Node.js, Express and PostgreSQL.",
    /** Set to your deployed origin; used for canonical URLs and OpenGraph. */
    siteUrl: TODO("https://your-domain.com"),
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
