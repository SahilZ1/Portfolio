/**
 * Experience, skills, certifications, achievements and education.
 *
 * Every factual claim in this file (employers, titles, dates, qualifications,
 * certifications and recognitions) comes from Sahil's own résumé and LinkedIn
 * profile. Nothing is inferred or embellished; where neither source carries a
 * number, the entry describes the work concretely rather than inventing a metric.
 *
 * The two sources describe the AIIDA internship differently: "Software Engineer
 * Intern" on the résumé, "Cyber Security Analyst Intern" on LinkedIn. The
 * LinkedIn title is used and the duties from both are kept. They are Sahil's own
 * accounts of one job, so carrying both is more complete than picking one and
 * quietly dropping the rest.
 *
 * `evidencedSkills` is kept deliberately separate from `skillGroups`. The former
 * lists only capabilities a reader can verify by looking at a published project,
 * and each entry names which one. The latter is experience from elsewhere.
 */

/* ------------------------------------------------------------------ about -- */

export const about = {
  /** Two or three paragraphs in first person. */
  bio: [
    "I am a cyber security analyst intern at AIIDA and a final-year Bachelor of Computing Science (Honours) student at UTS. My work sits across SOC operations, threat monitoring and network security analysis: vulnerability assessments, SIEM monitoring, incident triage and endpoint investigation, alongside cloud security controls in Microsoft Entra ID and Azure.",
    "Most of what I know I learned by building something and then attacking it. I wrote a Python network intrusion detection system to understand what a port scan actually looks like in a packet stream. I stood up a Splunk SOC lab to find out what a detection rule costs to tune. I built a phishing simulation game because spotting a lure in an inbox is a different skill from spotting one on a slide. This site is part of the same habit: the analytics platform behind it is mine, and so are the hardening decisions documented in the open.",
    "I hold the AWS Certified Cloud Practitioner and Microsoft SC-900 certifications and I am working through the CCNA. What I am looking for is a junior cyber analyst or backend engineering role where detection, investigation and the systems being defended are all part of one job.",
  ],

  /** Short factual rows shown beside the bio. */
  facts: [
    { label: "Focus", value: "SOC operations, threat detection, cloud security" },
    { label: "Location", value: "Greater Sydney Area, Australia" },
    { label: "Currently", value: "Cyber Security Analyst Intern at AIIDA · Final-year BCompSci (Hons), UTS" },
    { label: "Looking for", value: "Junior Cyber Analyst / Backend Engineering" },
  ],

  /** How I work, in three. */
  principles: [
    {
      name: "Analytical thinking",
      body: "A single log line means nothing. The answer lives in the pattern across events, so I look for the shape of the thing before I reach for a threshold. Building the detector is what surfaces the questions that reading about detection never does.",
    },
    {
      name: "Stakeholder management",
      body: "Most of a security finding's value is lost if the person who has to act on it cannot follow it. I learned that coordinating clinicians and IT teams in a hospital before I applied it to writing up a vulnerability, and I write for the reader rather than the reviewer.",
    },
    {
      name: "Teamwork",
      body: "Good security work is rarely done alone. I would rather hand over a clean set of notes and have someone else find the hole in my reasoning than be the only person who understands what I built.",
    },
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
    role: "Cyber Security Analyst (self-directed projects)",
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
      "Acted as a point of contact for patients and carers in a sensitive oncology environment under strict confidentiality obligations. It is the practical version of the access-control and least-privilege reasoning I now apply to systems.",
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
    role: "Safety Coordinator, Amazon site",
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
    organisation: "UTS Marketing Startup",
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
 * Each entry states plainly what happened and who was involved, and nothing is
 * listed here that could not be checked.
 */
export const achievements = [
  {
    title: "Best Team Player of the Month",
    issuer: "AIIDA",
    date: "2026",
    detail:
      "Recognised by AIIDA for my contribution to the team during the cyber security internship.",
  },
  {
    title: "Hack The Box Cyber Apocalypse CTF 2026",
    issuer: "Hack The Box",
    date: "2026",
    detail:
      "Finished 698th of 6,744 teams, in the top 10% globally, solving 58 challenges as a pair.",
  },
];

/* ----------------------------------------------------------------- skills -- */

/**
 * Skills demonstrated by published work.
 *
 * Every entry names the project that evidences it, and every one of those
 * projects is public: this site, the NIDS, the Splunk SOC lab and the Sysmon
 * detection write-up. That is the point of keeping this list separate from
 * `skillGroups`: these are checkable, and the page says so.
 *
 * The Splunk SOC lab is the one project here with no repository of its own; it
 * is evidenced by its case study on this site rather than by source.
 */
export const evidencedSkills = [
  {
    group: "Cybersecurity",
    items: [
      { name: "Network intrusion detection", evidence: "NIDS: sliding-window port-scan, traffic-spike and high-risk-port rules in Python and Scapy" },
      { name: "Packet capture & traffic analysis", evidence: "NIDS: live interface capture and offline PCAP analysis, verified alongside Wireshark" },
      { name: "SIEM engineering", evidence: "Splunk SOC lab: seven detections built over Windows Event Logs and Sysmon" },
      { name: "Endpoint detection & telemetry", evidence: "Sysmon Event ID 3 used to reconstruct an Nmap port scan end to end" },
      { name: "Alert tuning & validation", evidence: "Detections fired deliberately to confirm them; per-source cooldown suppresses duplicate alerts" },
      { name: "MITRE ATT&CK mapping", evidence: "Reconnaissance activity mapped to T1046, Network Service Discovery" },
      { name: "Content Security Policy", evidence: "This site: strict policy with no script-src exemptions" },
      { name: "Authentication hardening", evidence: "This site: bcrypt, lockout, timing-safe failure paths, session regeneration" },
      { name: "CSRF & session security", evidence: "This site: SameSite=Strict plus double-submit tokens" },
      { name: "Input validation", evidence: "This site: schema validation and normalisation on every untrusted ingest path" },
    ],
  },
  {
    group: "Full-stack engineering",
    items: [
      { name: "Node.js & Express 5", evidence: "This site: layered API: config, middleware, routes, services" },
      { name: "PostgreSQL", evidence: "This site: schema design, indexing strategy, forward-only migrations" },
      { name: "SQL", evidence: "Window-free aggregation, CTEs, generate_series time series, GIN-indexed JSONB" },
      { name: "REST API design", evidence: "Versionless resource endpoints with bounded, validated query parameters" },
      { name: "React 19", evidence: "Routed SPA with reusable components and no state library" },
      { name: "Accessibility", evidence: "Semantic landmarks, focus management, contrast-checked palette" },
      { name: "Data visualisation", evidence: "Hand-built SVG chart primitives including a flow diagram" },
      { name: "Python & Godot", evidence: "NIDS CLI and SQLite store in Python; PhishSafe built in Godot with GDScript" },
    ],
  },
  {
    group: "Data & privacy engineering",
    items: [
      { name: "Analytics modelling", evidence: "Visitor / session / page-view / event model with journey reconstruction" },
      { name: "Privacy by design", evidence: "No fingerprinting, no raw IPs, UA discarded after classification" },
      { name: "Data retention", evidence: "Documented window enforced by a scheduled prune job" },
      { name: "Secure logging", evidence: "Key-based secret redaction and identifier truncation" },
      { name: "AI integration", evidence: "Provider abstraction with aggregate-only boundary and output verification" },
    ],
  },
];

/**
 * The wider toolkit: skills from work, study and self-directed projects beyond
 * this repository.
 */
export const skillGroups = [
  {
    group: "Professional",
    items: [
      "Analytical thinking",
      "Problem solving",
      "Stakeholder management",
      "Stakeholder communication",
      "Teamwork",
      "Cross-functional collaboration",
      "Technical documentation",
      "Adaptability",
    ],
  },
  {
    group: "Frameworks & Technology",
    items: [
      "CIA Triad",
      "MITRE ATT&CK",
      "Cyber Kill Chain",
      "Essential Eight",
      "Zero Trust",
      "Principle of Least Privilege",
      "Splunk Enterprise",
      "Sysmon",
      "Wireshark",
      "Nmap",
      "Burp Suite",
      "Microsoft Entra ID",
      "Azure Backup",
      "AWS",
    ],
  },
  {
    group: "Development",
    items: [
      "Python",
      "SQL",
      "JavaScript (Node.js)",
      "Bash scripting",
      "GDScript",
      "FastAPI",
      "RESTful API design",
      "PostgreSQL",
      "Relational data modelling",
      "Git version control",
      "CI/CD workflows",
      "Vercel",
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
    name: "Microsoft Certified: Security, Compliance, and Identity Fundamentals (SC-900)",
    issuer: "Microsoft",
    status: "Held",
  },
  {
    name: "Cisco Certified Network Associate (CCNA)",
    issuer: "Cisco",
    status: "In progress, commenced March 2026",
  },
  {
    name: "Data Analytics",
    issuer: "University of Technology Sydney",
    status: "Completed: SQL, data cleaning and data modelling",
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
