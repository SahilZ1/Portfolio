/**
 * Experience, skills, certifications and education.
 *
 * Almost everything in this file is a placeholder. Sahil's employment history,
 * dates, grades, certification numbers and institutions were not available when
 * this was built, and inventing them would be fabricating a professional record
 * — the one thing a portfolio must never do.
 *
 * The exception is `evidencedSkills`, which lists only capabilities a reader can
 * verify by looking at this repository. That distinction is shown on the page:
 * evidenced skills are marked as demonstrated by this site, and the rest are for
 * Sahil to fill in from his own experience.
 */

import { TODO } from "./site.js";

/* ------------------------------------------------------------------ about -- */

export const about = {
  /** Two or three paragraphs in first person. */
  bio: [
    TODO("Paragraph 1 — who you are and what you work on. Lead with your strongest, most specific fact."),
    TODO("Paragraph 2 — how you got here, and what you are drawn to within security."),
    TODO("Paragraph 3 — what you are looking for next."),
  ],

  /** Short factual rows shown beside the bio. */
  facts: [
    { label: "Focus", value: TODO("e.g. Application security, cloud security") },
    { label: "Location", value: TODO("e.g. Melbourne, Australia") },
    { label: "Currently", value: TODO("e.g. Final-year Cybersecurity student / Security Analyst at …") },
    { label: "Looking for", value: TODO("e.g. Graduate security engineering roles") },
  ],

  /**
   * Things you actually care about technically. Strong differentiator on a
   * portfolio — but write your own; these must be yours.
   */
  principles: [
    TODO("A principle you hold about building secure systems."),
    TODO("Another one."),
    TODO("A third."),
  ],
};

/* ------------------------------------------------------------- experience -- */

export const experience = [
  {
    role: TODO("Job title"),
    organisation: TODO("Employer"),
    period: TODO("e.g. Feb 2025 – present"),
    location: TODO("e.g. Melbourne, hybrid"),
    summary: TODO("One sentence on the remit of the role."),
    highlights: [
      TODO("A specific thing you did and its effect. Avoid unquantified claims — if you have no number, describe the change concretely instead."),
      TODO("Another."),
      TODO("Another."),
    ],
    stack: [TODO("Tools and technologies you actually used")],
  },
  {
    role: TODO("Previous job title — duplicate or delete this block as needed"),
    organisation: TODO("Employer"),
    period: TODO("e.g. Jul 2023 – Jan 2025"),
    location: TODO("Location"),
    summary: TODO("One sentence."),
    highlights: [TODO("Highlight"), TODO("Highlight")],
    stack: [TODO("Technologies")],
  },
];

/* ----------------------------------------------------------------- skills -- */

/**
 * Skills demonstrated by this repository.
 *
 * Every entry here is checkable against the source, which is why they are
 * presented separately and labelled as evidenced. Nothing in this list is a
 * claim about experience elsewhere.
 */
export const evidencedSkills = [
  {
    group: "Backend engineering",
    items: [
      { name: "Node.js & Express 5", evidence: "Layered API: config, middleware, routes, services" },
      { name: "PostgreSQL", evidence: "Schema design, indexing strategy, forward-only migrations" },
      { name: "SQL", evidence: "Window-free aggregation, CTEs, generate_series time series, GIN-indexed JSONB" },
      { name: "REST API design", evidence: "Versionless resource endpoints with bounded, validated query parameters" },
    ],
  },
  {
    group: "Application security",
    items: [
      { name: "Content Security Policy", evidence: "Strict policy with no script-src exemptions" },
      { name: "Authentication", evidence: "bcrypt, lockout, timing-safe failure paths, session regeneration" },
      { name: "CSRF & session security", evidence: "SameSite=Strict plus double-submit tokens" },
      { name: "Input validation", evidence: "Schema validation and normalisation on every untrusted ingest path" },
      { name: "Secure logging", evidence: "Key-based secret redaction and identifier truncation" },
    ],
  },
  {
    group: "Frontend engineering",
    items: [
      { name: "React 19", evidence: "Routed SPA with reusable components and no state library" },
      { name: "Animation", evidence: "Transform/opacity-only motion, reduced-motion honoured throughout" },
      { name: "Accessibility", evidence: "Semantic landmarks, focus management, contrast-checked palette" },
      { name: "Data visualisation", evidence: "Hand-built SVG chart primitives including a flow diagram" },
    ],
  },
  {
    group: "Data & privacy engineering",
    items: [
      { name: "Analytics modelling", evidence: "Visitor / session / page-view / event model with journey reconstruction" },
      { name: "Privacy by design", evidence: "No fingerprinting, no raw IPs, UA discarded after classification" },
      { name: "Data retention", evidence: "Documented window enforced by a scheduled prune job" },
      { name: "AI integration", evidence: "Provider abstraction with aggregate-only boundary and output verification" },
    ],
  },
];

/**
 * Sahil's own skills, beyond what this repository shows.
 * Fill these in — they are the ones a security recruiter will scan for.
 */
export const skillGroups = [
  {
    group: "Security",
    items: [TODO("e.g. Threat modelling, SIEM, incident response, penetration testing")],
  },
  {
    group: "Cloud & infrastructure",
    items: [TODO("e.g. AWS, Azure, Terraform, Docker, Kubernetes")],
  },
  {
    group: "Languages",
    items: [TODO("e.g. Python, JavaScript, Go, Bash, SQL")],
  },
  {
    group: "Tools",
    items: [TODO("e.g. Burp Suite, Wireshark, Nmap, Splunk, Metasploit")],
  },
];

/* --------------------------------------------------------- certifications -- */

export const certifications = [
  {
    name: TODO("Certification name, e.g. CompTIA Security+"),
    issuer: TODO("Issuing body"),
    date: TODO("Issued date"),
    credentialId: TODO("Credential ID, or delete this line"),
    url: TODO("Verification URL, or delete this line"),
    status: TODO("e.g. “Held” / “In progress — exam booked for …”"),
  },
  {
    name: TODO("Second certification — duplicate or delete this block"),
    issuer: TODO("Issuing body"),
    date: TODO("Issued date"),
    credentialId: TODO("Credential ID"),
    url: TODO("Verification URL"),
    status: TODO("Status"),
  },
];

/* -------------------------------------------------------------- education -- */

export const education = [
  {
    qualification: TODO("e.g. Bachelor of Cybersecurity"),
    institution: TODO("University name"),
    period: TODO("e.g. 2022 – 2026"),
    location: TODO("Location"),
    detail: TODO("Relevant coursework, major, thesis topic, or notable results. Do not list a grade you do not have."),
  },
];
