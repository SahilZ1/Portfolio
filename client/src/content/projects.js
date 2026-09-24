/**
 * Project case studies.
 *
 * Two entries, with very different evidence levels, and the difference is
 * marked honestly on the page:
 *
 *  - `portfolio-analytics` describes this repository. Every claim in it is
 *    verifiable by reading the source, so it is written in full detail.
 *
 *  - `threatscope` is Sahil's own project. The *structure* of the case study is
 *    built out and ready, but the factual content is left as placeholders,
 *    because inventing features, metrics or outcomes for someone else's project
 *    would be fabrication. Fill in the TODO markers and delete the `draft` flag.
 *
 * No statistic anywhere in this file is made up. Where a number would normally
 * go and none is known, the field is a placeholder rather than a guess.
 */

import { TODO } from "./site.js";

export const projects = [
  {
    slug: "threatscope",
    name: "ThreatScope",
    tagline: TODO("One line: what ThreatScope does, e.g. “Threat intelligence aggregation and enrichment pipeline”"),
    category: "Threat Intelligence",
    /** `draft: true` renders a visible “case study in progress” banner. */
    draft: true,
    year: TODO("e.g. 2025"),
    status: TODO("e.g. “In active development” / “Shipped” / “Archived”"),
    accent: "threat",

    /** Shown on the index card. Keep to two sentences. */
    summary: TODO(
      "Two sentences a recruiter can read in five seconds. What problem does ThreatScope solve, and for whom?"
    ),

    tags: [TODO("Add the real stack tags, e.g. Python, PostgreSQL, MISP, STIX/TAXII")],

    sections: {
      overview: TODO(
        "What is ThreatScope? Who would use it? What does it do that an off-the-shelf tool does not? Two or three short paragraphs."
      ),
      problem: TODO(
        "What specific problem prompted you to build it? Be concrete — the sharper the problem statement, the stronger the case study."
      ),
      solution: TODO(
        "How does it solve that problem? Describe the approach, not a feature list."
      ),
      architecture: {
        description: TODO("How the system is put together, and why it is shaped that way."),
        /** Rendered as a labelled flow diagram. Replace with your real stages. */
        flow: [TODO("e.g. Feed ingestion"), TODO("e.g. Normalisation"), TODO("e.g. Enrichment"), TODO("e.g. Scoring"), TODO("e.g. Analyst interface")],
      },
      capabilities: {
        description: TODO("What threat-intelligence capabilities does it actually have today?"),
        items: [
          TODO("Capability 1 — only list what is genuinely implemented"),
          TODO("Capability 2"),
          TODO("Capability 3"),
        ],
      },
      technology: [
        { area: "Language & runtime", value: TODO("e.g. Python 3.12") },
        { area: "Data store", value: TODO("e.g. PostgreSQL 16") },
        { area: "Intelligence sources", value: TODO("e.g. OTX, abuse.ch, internal feeds") },
        { area: "Interface", value: TODO("e.g. FastAPI + React") },
        { area: "Deployment", value: TODO("e.g. Docker Compose on a private VPS") },
      ],
      security: {
        description: TODO(
          "How did you secure it? API key handling, input validation on untrusted feed data, isolation of analysis, least privilege on the database."
        ),
        items: [TODO("Security control 1"), TODO("Security control 2"), TODO("Security control 3")],
      },
      challenges: [
        TODO("A real problem you hit and how you solved it. Specific beats impressive."),
        TODO("Another one."),
      ],
      results: TODO(
        "What is the outcome? If you have no measured numbers, describe capability rather than inventing a metric — an honest 'it processes N feeds and surfaces X' beats a fabricated percentage."
      ),
      lessons: [
        TODO("What you would do differently next time."),
        TODO("Something the project taught you about security engineering."),
      ],
    },

    screenshots: [
      // Add images to client/public/projects/ and reference them here:
      //   { src: "/projects/threatscope-dashboard.png", alt: "…", caption: "…" }
    ],

    links: {
      github: TODO("https://github.com/your-username/threatscope"),
      demo: TODO("Live demo URL, or delete this line if there is not one"),
    },
  },

  {
    slug: "portfolio-analytics",
    name: "Portfolio Analytics Platform",
    tagline: "A first-party, privacy-conscious web analytics platform — the one running on this site.",
    category: "Full-stack / Security Engineering",
    draft: false,
    year: "2026",
    status: "Running in production on this site",
    accent: "analytics",

    summary:
      "Rather than adding Google Analytics, this site runs an analytics platform built from scratch: anonymous visitor identity, session reconstruction, page-view and event ingest, journey analysis, and a private admin console — on Node.js, Express and PostgreSQL.",

    tags: ["Node.js", "Express 5", "PostgreSQL 18", "React", "bcrypt", "CSP", "SQL"],

    sections: {
      overview: `Every page you have loaded on this site has been recorded by a system built for it specifically. There is no third-party analytics script anywhere in the page, no external network request, and no data leaves the origin.

The platform tracks what a portfolio owner actually wants to know — which projects get read, where visitors arrive from, how far they get before leaving — while collecting materially less about the visitor than a standard commercial tag would. It is the same problem every analytics vendor solves, solved with the privacy trade-offs chosen deliberately rather than inherited.`,

      problem: `Third-party analytics is the default answer, and it has two problems worth taking seriously.

The first is privacy. A commercial tag typically collects a full User-Agent string, screen and hardware characteristics, precise IP-derived location and a cross-site identifier, then sends all of it to infrastructure the site owner does not control. Most of that is unnecessary to answer "did anyone read my ThreatScope write-up".

The second is that using one demonstrates nothing. A security portfolio that outsources its own instrumentation to a script tag is not evidence of engineering ability.`,

      solution: `A four-level data model — visitor, session, page view, event — with an ingest API, an aggregation layer and an authenticated console on top.

Identity is a random v4 UUID in an HttpOnly first-party cookie. It is generated by the platform CSPRNG and derived from nothing about the visitor: no IP, no User-Agent hash, no canvas, no clock skew. Two people on one machine get unrelated identifiers, and the same person in a private window is a new visitor. That is a deliberate accuracy cost paid to avoid fingerprinting.

Sessions are reconstructed server-side from activity with a 30-minute inactivity window, which is what makes returning-visitor and journey analysis possible without any persistent client-side state.`,

      architecture: {
        description:
          "Single origin throughout. The React SPA and the Express API are served from one host, which keeps the visitor cookie first-party, removes CORS from the design entirely, and means the tracking beacon cannot be blocked as third-party.",
        flow: [
          "Browser (React SPA)",
          "Express ingest API",
          "Validation & classification",
          "PostgreSQL",
          "Aggregation layer",
          "Admin console",
          "AI insight layer",
        ],
      },

      capabilities: {
        description: "What the platform measures, and how.",
        items: [
          "Anonymous visitors, sessions, page views and typed interaction events",
          "Traffic-source attribution from referrers — Google, LinkedIn, GitHub, search, referral, direct",
          "Journey reconstruction: entry pages, page-to-page transitions, common paths, exit points",
          "Coarse device, browser and OS families, parsed at ingest with the raw User-Agent discarded",
          "Bot filtering applied to every reported figure",
          "AI-assisted commentary, with every generated number verified against the source data",
        ],
      },

      technology: [
        { area: "Runtime", value: "Node.js 24, Express 5" },
        { area: "Database", value: "PostgreSQL 18, with a forward-only SQL migration runner" },
        { area: "Frontend", value: "React 19, Vite, React Router, Framer Motion" },
        { area: "Charts", value: "Hand-built SVG primitives — no chart library" },
        { area: "Auth", value: "bcrypt, PostgreSQL-backed server-side sessions" },
        { area: "Hardening", value: "Helmet, strict CSP, rate limiting, parameterised SQL throughout" },
      ],

      security: {
        description:
          "The threat model is small but real: the ingest endpoints accept unauthenticated input from any browser, and the console guards data the owner would not want public.",
        items: [
          "Strict CSP with no 'unsafe-inline' and no 'unsafe-eval' on scripts, and connect-src locked to 'self' so exfiltration to a third party is blocked even if a script were injected",
          "Every SQL statement parameterised; ingest paths normalised and length-bounded before they reach the database",
          "Session fixation prevented by regenerating the session id at the moment of privilege change",
          "Login protected by per-IP rate limiting, per-account lockout, and a constant-time dummy hash comparison so a missing username is not distinguishable by response timing",
          "CSRF blocked by SameSite=Strict on the admin cookie plus a double-submit token on every state-changing request",
          "Production error responses carry no stack trace, SQL fragment or driver error code",
          "Logs redact secrets by key and truncate pseudonymous identifiers to an 8-character prefix",
        ],
      },

      challenges: [
        "The original visitor middleware wrote to PostgreSQL on every HTTP request — including every asset and favicon probe — so a single page load produced dozens of writes and rewrote last_seen from asset traffic. Moving all database work to the ingest endpoints reduced it to one write path per real navigation.",
        "Raw User-Agent strings were being stored. A full UA is a meaningful fingerprinting component and the dashboard only needs three coarse answers from it, so classification moved to ingest time and the column was dropped rather than left dormant.",
        "Letting a language model describe analytics invites invented statistics. The fix was to verify output rather than trust it: every number in a generated insight is checked against the source aggregates, and any sentence containing a figure that is not in the data is discarded before it reaches the screen.",
      ],

      results:
        "The platform is live on this site and is the source of every figure in the admin console. Concrete outcomes: no third-party requests on any page, no raw IP addresses stored anywhere, raw User-Agent strings never persisted, and a documented retention window that is actually enforced by a scheduled job rather than merely promised.",

      lessons: [
        "Privacy decisions are mostly schema decisions. Choosing not to store a column is a far stronger control than choosing not to look at it.",
        "Denormalised counters on the session row removed correlated subqueries from nearly every dashboard aggregate — worth the write cost many times over.",
        "An AI feature is only as trustworthy as its verification step. Grounding output in checked data matters more than the prompt.",
      ],
    },

    screenshots: [],

    links: {
      github: TODO("https://github.com/your-username/portfolio — add once this repo is pushed"),
      demo: null,
    },
  },
];

export const getProject = (slug) => projects.find((project) => project.slug === slug);
