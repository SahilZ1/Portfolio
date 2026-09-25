/**
 * Experience, skills, certifications, achievements and education.
 *
 * Every factual claim in this file — employers, titles, dates, qualifications,
 * certifications and recognitions — comes from Sahil's own résumé and LinkedIn
 * profile. Nothing is inferred or embellished; where neither source carries a
 * number, the entry describes the work concretely rather than inventing a metric.
 *
 * Where the two sources describe the same role differently — the AIIDA
 * internship is titled "Software Engineer Intern" on the résumé and "Cyber
 * Security Analyst Intern" on LinkedIn — the LinkedIn title is used and the
 * duties from both are kept. They are Sahil's own accounts of one job, so
 * carrying both is more complete than picking one and quietly dropping the rest.
 *
 * `evidencedSkills` is kept deliberately separate from `skillGroups`. The former
 * lists only capabilities a reader can verify by looking at this repository, and
 * the page labels them as such. The latter is experience from elsewhere.
 */

/* ------------------------------------------------------------------ about -- */

export const about = {
  /** Two or three paragraphs in first person. */
  bio: [
    "I am a cyber security analyst intern at AIIDA and a final-year Bachelor of Computing Science (Honours) student at UTS. My work sits across SOC operations, threat monitoring and network security analysis — vulnerability assessments, SIEM monitoring, incident triage and endpoint investigation, alongside cloud security controls in Microsoft Entra ID and Azure.",
    "Most of what I know I learned by building something and then attacking it. I wrote a Python network intrusion detection system to understand what a port scan actually looks like in a packet stream; I stood up a Splunk SOC lab to find out what a detection rule costs to tune; I built a phishing simulation game because spotting a lure in an inbox is a different skill from spotting one on a slide. This site is part of the same habit — the analytics platform behind it is mine, and so are the hardening decisions documented in the open.",
    "I am AWS Certified, working through the CCNA, and looking for graduate cyber security and SOC analyst work where detection, investigation and the systems being defended are all part of one job.",
  ],

  /** Short factual rows shown beside the bio. */
  facts: [
    { label: "Focus", value: "SOC operations, threat detection, cloud security" },
    { label: "Location", value: "Greater Sydney Area, Australia" },
    { label: "Currently", value: "Cyber Security Analyst Intern at AIIDA · Final-year BCompSci (Hons), UTS" },
    { label: "Looking for", value: "Graduate cyber security and SOC analyst roles" },
  ],

  /**
   * Technical convictions. Drawn from the detection and hardening work in these
   * projects — worth rewording into your own voice.
   */
  principles: [
    "A single log line means nothing. Detection lives in the pattern across events from one source, which is why a rule needs a time window rather than a threshold on one entry.",
    "Privacy decisions are mostly schema decisions. Choosing not to store a column is a far stronger control than choosing not to look at it.",
    "An exemption you can explain is fine; an exemption you inherited is a finding. That holds for a CSP directive, a firewall rule and a database grant alike.",
    "Build the thing before you defend it. Writing the detector is what surfaces the questions that reading about detection never does.",
  ],
};

/* ------------------------------------------------------------- experience -- */

export const experience = [
  {
    role: "Cyber Security Analyst Intern",
    organisation: "AIIDA",
    period: "Apr 2026 – present",
    location: "New South Wales, on-site",
    summary:
      "Security analysis and cloud security work across client environments and the company's own products, in a multidisciplinary consulting team.",
    highlights: [
      "Assisted with vulnerability assessments, cyber security client proposals and Business Continuity Planning to support client security and resilience.",
      "Implemented Microsoft Entra ID security controls and managed Azure Backup deployments across multiple client environments, including backup validation and recovery testing.",
      "Conducted internal security testing and vulnerability assessments on company products, identifying risks and contributing to remediation.",
      "Worked to Zero Trust and least-privilege principles across client and internal environments.",
      "Built RESTful APIs and backend services in Python, FastAPI and Node.js, with relational data models and optimised SQL in PostgreSQL, deployed to Vercel through CI/CD-style workflows.",
      "Wrote automation tooling in Python and Bash, and documented work in structured technical writing for both technical and non-technical stakeholders.",
    ],
    stack: [
      "Microsoft Entra ID",
      "Azure Backup",
      "Zero Trust",
      "Essential Eight",
      "Vulnerability assessment",
      "Python",
      "FastAPI",
      "PostgreSQL",
    ],
  },
  {
    role: "Cyber Security Analyst — self-directed projects",
    organisation: "Self-employed",
    period: "Apr 2024 – May 2026",
    location: "New South Wales",
    summary:
      "Self-directed security engineering: building detection tooling and awareness training, testing it, and publishing the write-ups.",
    highlights: [
      "Developed a Python network intrusion detection system that monitors live traffic and detects port scans, traffic spikes and high-risk connections.",
      "Built a phishing simulation game to improve user awareness of social-engineering threats.",
      "Developed Python tooling to automate processes and simulate real-world security scenarios.",
      "Designed systems with secure authentication logic and considered data-handling practices.",
      "Applied network monitoring techniques and analysed traffic patterns with Wireshark.",
    ],
    stack: ["Python", "Scapy", "Wireshark", "Sysmon", "Splunk", "Godot", "SQLite"],
  },
  {
    role: "Medical Secretary",
    organisation: "NSW Government",
    period: "Feb 2025 – Apr 2026",
    location: "New South Wales, on-site",
    summary:
      "High-level secretarial and administrative support in the Cancer Genetics Department at the Cancer Therapy Centre.",
    highlights: [
      "Supported coordination of patient care and clinical services, managing complex diaries, meetings, agendas and minutes.",
      "Produced professional reports and presentations to the standard of a governance-heavy organisation.",
      "Acted as a point of contact for patients and carers in a sensitive oncology environment under strict confidentiality obligations — the practical version of the access-control and least-privilege reasoning I now apply to systems.",
      "Collaborated with medical, nursing, allied health and IT teams, liaising across internal and external stakeholders.",
    ],
    stack: [
      "Confidential data handling",
      "Governance & compliance",
      "Stakeholder coordination",
      "Technical reporting",
    ],
  },
  {
    role: "Safety Coordinator — Amazon",
    organisation: "Adecco",
    period: "Sep 2024 – Feb 2025",
    location: "New South Wales, on-site",
    summary:
      "Workplace health and safety auditing on an Amazon site: inspections, risk assessment and corrective action.",
    highlights: [
      "Conducted regular safety audits and inspections against workplace health and safety regulations and internal standards.",
      "Identified hazards, assessed risk and implemented corrective actions to prevent incidents.",
      "Supported incident investigations and maintained accurate documentation and reporting of audit findings.",
      "Worked with cross-functional teams on continuous improvement of a safe and compliant operating environment.",
    ],
    stack: ["Auditing", "Risk assessment", "Incident investigation", "Compliance reporting"],
  },
  {
    role: "Software Engineer Intern",
    organisation: "AEK Media",
    period: "Mar 2024 – May 2024",
    location: "New South Wales, on-site",
    summary:
      "Part-time internship spanning application development and network security work in a live production environment.",
    highlights: [
      "Designed and deployed AI-powered chatbots to automate customer enquiries, integrating SQL databases for storage and management.",
      "Contributed to security measures across systems and networks, including firewall configuration to protect digital assets.",
      "Analysed network traffic with Wireshark to identify potential threats and monitor data flow.",
      "Worked with senior developers to identify system vulnerabilities and recommend practical improvements.",
    ],
    stack: ["AI chatbots", "SQL databases", "Wireshark", "Firewalls", "Network security"],
  },
];

/* ----------------------------------------------------------- achievements -- */

/**
 * Recognitions and competition results.
 *
 * Each entry states plainly what happened and who was involved. The NASA
 * disclosure in particular is worded as what it was — a team effort at AIIDA
 * that Sahil was named in — because overstating an individual role in a
 * coordinated disclosure would be both inaccurate and trivially checkable.
 */
export const achievements = [
  {
    title: "NASA vulnerability disclosure",
    issuer: "AIIDA — team recognition",
    date: "2026",
    detail:
      "Named as part of the AIIDA cyber security team that identified and responsibly disclosed critical vulnerabilities on NASA's official website, and received official recognition for the disclosure. Supporting documentation is not public, under the responsible-disclosure and confidentiality terms of the engagement.",
  },
  {
    title: "Hack The Box Cyber Apocalypse CTF 2026",
    issuer: "Hack The Box",
    date: "2026",
    detail:
      "Finished 698th of 6,744 teams — the top 10% globally — solving 58 challenges, competing as a pair.",
  },
  {
    title: "Best Team Player of the Month",
    issuer: "AIIDA",
    date: "2026",
    detail:
      "Recognised by AIIDA for contribution to the team during the cyber security internship.",
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
 * The wider toolkit — from work, study and self-directed projects beyond this
 * repository.
 */
export const skillGroups = [
  {
    group: "Security operations",
    items: [
      "SOC operations",
      "SIEM monitoring",
      "Incident triage",
      "Endpoint analysis",
      "Threat detection",
      "Detection engineering",
      "Alert tuning & validation",
    ],
  },
  {
    group: "Security tooling",
    items: ["Splunk Enterprise", "Sysmon", "Wireshark", "Nmap", "Burp Suite", "Scapy"],
  },
  {
    group: "Frameworks & methodology",
    items: [
      "MITRE ATT&CK",
      "Cyber Kill Chain",
      "Essential Eight",
      "Zero Trust",
      "Principle of Least Privilege",
      "Vulnerability assessment",
      "Business Continuity Planning",
    ],
  },
  {
    group: "Networking",
    items: [
      "TCP/IP",
      "Network traffic analysis",
      "Port scanning & detection",
      "Firewalls",
      "Windows Event Logs",
    ],
  },
  {
    group: "Cloud & infrastructure",
    items: [
      "AWS (certified)",
      "Microsoft Entra ID",
      "Azure Backup",
      "Vercel",
      "CI/CD workflows",
      "Linux & Windows environments",
      "Virtualisation",
    ],
  },
  {
    group: "Languages",
    items: ["Python", "SQL", "JavaScript (Node.js)", "Bash scripting", "GDScript"],
  },
  {
    group: "Development",
    items: [
      "FastAPI",
      "Node.js",
      "RESTful API design & development",
      "PostgreSQL",
      "Relational data modelling",
      "Git version control",
    ],
  },
  {
    group: "Professional",
    items: [
      "Analytical thinking",
      "Problem solving",
      "Stakeholder communication",
      "Technical documentation",
      "Cross-functional collaboration",
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
