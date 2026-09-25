/**
 * Experience, skills, certifications and education.
 *
 * Every factual claim in this file — employers, dates, qualifications and
 * certifications — comes from Sahil's own résumé. Nothing is inferred or
 * embellished; where the résumé carries no number, the entry describes the work
 * concretely rather than inventing a metric.
 *
 * `evidencedSkills` is kept deliberately separate from `skillGroups`. The former
 * lists only capabilities a reader can verify by looking at this repository, and
 * the page labels them as such. The latter is experience from elsewhere.
 */

/* ------------------------------------------------------------------ about -- */

export const about = {
  /** Two or three paragraphs in first person. */
  bio: [
    "I am a final-year Bachelor of Computing Science (Honours) student at UTS, currently a software engineer intern at AIIDA in Sydney. I build backend systems — RESTful APIs and services in Python, FastAPI and Node.js, backed by relational data models in PostgreSQL — and I take them the whole way through the lifecycle, from design to test to a deployed release.",
    "I came to engineering through the full stack rather than a single layer, which is why the security side of the work holds my attention as much as the building does. Designing a schema, deciding what not to store, working out which cookie attribute defends against which attack: those turn out to be the same kind of problem as making a query fast or an API predictable. This site is where I do that work in the open — the analytics platform behind it is mine, and so are the hardening decisions documented alongside it.",
    "I am AWS Certified, working through the CCNA, and looking for graduate software engineering work where backend development, cloud deployment and security are part of one role rather than three separate teams.",
  ],

  /** Short factual rows shown beside the bio. */
  facts: [
    { label: "Focus", value: "Backend engineering, cloud deployment, security engineering" },
    { label: "Location", value: "Sydney, NSW, Australia" },
    { label: "Currently", value: "Software Engineer Intern at AIIDA · Final-year BCompSci (Hons), UTS" },
    { label: "Looking for", value: "Graduate software engineering roles" },
  ],

  /**
   * Technical convictions. Drafted from the work in this repository and the
   * résumé — worth reading through and rewording into your own voice.
   */
  principles: [
    "Privacy decisions are mostly schema decisions. Choosing not to store a column is a far stronger control than choosing not to look at it.",
    "An exemption you can explain is fine; an exemption you inherited is a finding. That holds for a CSP directive, a database grant and a dependency alike.",
    "Automate the workflow you have done by hand three times. A lot of the leverage on an engineering team sits in the scripts nobody asked for.",
    "Code is read far more often than it is written, and documented far less often than it should be. Both are part of shipping, not something that happens after.",
  ],
};

/* ------------------------------------------------------------- experience -- */

export const experience = [
  {
    role: "Software Engineer Intern",
    organisation: "AIIDA",
    period: "Apr 2026 – present",
    location: "Sydney, NSW",
    summary:
      "Backend engineering across the full software development lifecycle — API design and development through to testing, deployment and production support.",
    highlights: [
      "Designed and built RESTful APIs and backend services in Python, FastAPI and Node.js, taking features from design through development, integration and test to release.",
      "Deployed and maintained applications on Vercel using CI/CD-style workflows, shipping reliable releases to production.",
      "Designed and managed relational data models in PostgreSQL, writing optimised SQL for application storage, retrieval and reporting.",
      "Wrote automation tooling and scripts in Python and Bash to streamline engineering workflows and remove repeated manual work.",
      "Collaborated with senior consultants in a multidisciplinary team, documenting work in structured technical writing pitched at both technical and non-technical stakeholders.",
    ],
    stack: ["Python", "FastAPI", "Node.js", "PostgreSQL", "SQL", "Bash", "Vercel", "CI/CD", "Git"],
  },
  {
    role: "Oncology Medical Secretary",
    organisation: "NSW Health",
    period: "Feb 2025 – Apr 2026",
    location: "Sydney, NSW",
    summary:
      "Senior administrative support inside a large clinical organisation operating under strict governance, confidentiality and data-handling requirements.",
    highlights: [
      "Worked with sensitive patient information under formal confidentiality and data-handling obligations — the practical version of the least-privilege and access-control reasoning I now apply to systems.",
      "Coordinated across internal clinical teams and external stakeholders, keeping records accurate in a high-volume environment where an error has real consequences.",
      "Produced professional reports and correspondence for senior clinicians, to the standards of a governance-heavy organisation.",
    ],
    stack: [
      "Governance & compliance",
      "Confidential data handling",
      "Stakeholder coordination",
      "Technical reporting",
    ],
  },
  {
    role: "Software Developer Intern",
    organisation: "AEK Media",
    period: "Mar 2024 – May 2024",
    location: "Sydney, NSW",
    summary:
      "Built and shipped AI chatbot applications that automated customer service workflows in a live production environment.",
    highlights: [
      "Developed and deployed AI chatbot applications to automate customer service workflows, running against real users rather than a staging dataset.",
      "Designed and integrated backend data storage on SQL databases, contributing to a scalable and maintainable application architecture.",
    ],
    stack: ["AI chatbots", "SQL databases", "Backend integration", "Production deployment"],
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
 * The wider toolkit — from work and study beyond this repository.
 */
export const skillGroups = [
  {
    group: "Languages",
    items: ["Python", "SQL", "JavaScript (Node.js)", "Bash scripting"],
  },
  {
    group: "Frameworks & backend",
    items: [
      "FastAPI",
      "Node.js",
      "RESTful API design & development",
      "Automation tooling",
      "Integration & test",
    ],
  },
  {
    group: "Databases",
    items: [
      "PostgreSQL",
      "Relational data modelling",
      "Query optimisation",
      "Data cleaning & modelling",
    ],
  },
  {
    group: "Cloud & deployment",
    items: [
      "AWS (certified)",
      "Vercel",
      "CI/CD workflows",
      "Linux & Windows environments",
      "Virtualisation",
    ],
  },
  {
    group: "Developer tools",
    items: ["Git version control", "Claude Code (AI-assisted development)", "Android Studio", "Xcode"],
  },
  {
    group: "Software practice",
    items: [
      "Full software development lifecycle",
      "Scalability & performance",
      "Maintainable, testable code",
      "Technical documentation",
    ],
  },
  {
    group: "Professional",
    items: [
      "Analytical thinking",
      "Problem solving",
      "Stakeholder communication",
      "Cross-functional collaboration",
      "Adaptability",
    ],
  },
];

/* --------------------------------------------------------- certifications -- */

export const certifications = [
  {
    name: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    date: "April 2026",
    status: "Held",
  },
  {
    name: "Cisco Certified Network Associate (CCNA)",
    issuer: "Cisco",
    status: "In progress — commenced March 2026",
  },
  {
    name: "Data Analytics",
    issuer: "University of Technology Sydney",
    status: "Completed — SQL, data cleaning and data modelling",
  },
];

/* -------------------------------------------------------------- education -- */

export const education = [
  {
    qualification: "Bachelor of Computing Science (Honours)",
    institution: "University of Technology Sydney",
    period: "Feb 2023 – present",
    location: "Sydney, NSW",
    detail:
      "Final year. Coursework across software development, databases, networking and cloud, with an Honours research component.",
  },
];
