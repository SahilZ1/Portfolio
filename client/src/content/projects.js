/**
 * Project case studies.
 *
 * ---------------------------------------------------------------------------
 * SOURCING RULE
 * ---------------------------------------------------------------------------
 * Every factual claim below is drawn from the repository it describes: its
 * README, its source, or its commit history. Thresholds, module names, port
 * lists and stack versions were read out of the code rather than estimated.
 *
 * Where a repository gave no answer, the field is simply absent. `ProjectDetail`
 * skips any section that has no content and renumbers the rest, so an omitted
 * section leaves no gap and no empty heading. That is deliberate: a missing
 * "what was hard" section is honest, and inventing a war story to fill the
 * heading would not be.
 *
 * No metric anywhere in this file is invented.
 * ---------------------------------------------------------------------------
 */

export const projects = [
  {
    slug: "phishsafe",
    name: "PhishSafe",
    tagline: "A phishing-awareness training game built as a simulated desktop operating system.",
    category: "Security Awareness / Game Development",
    draft: false,
    year: "2026",
    status: "Source published on GitHub",
    accent: "threat",

    summary:
      "Rather than teaching phishing recognition with a slide deck, PhishSafe drops the player into a fake desktop OS (mail, calendar, news, calculator, settings) and lets them meet suspicious messages in the place they would actually meet them. Built in Godot 4.6.",

    tags: ["Godot 4.6", "GDScript", "Security awareness", "Game development", "JSON"],

    sections: {
      overview: `PhishSafe is a security-awareness trainer shaped like an operating system. The player logs in to a simulated desktop and works through a normal-looking environment of inbox, calendar, news feed, calculator and settings panel, where some of the messages waiting for them are phishing attempts and some are not.

The design bet is that phishing recognition is contextual. An email that is obviously fraudulent in a training slide is much less obvious sitting in an inbox between two real ones, under time pressure, with a plausible sender and a familiar subject line. Putting the lesson inside a simulated desktop keeps that context intact.

The project is built in Godot 4.6 with GDScript, and is structured the way a small OS would be: a login screen, a desktop shell with launchable app items, resizeable windows, per-user accounts and profiles, and a global manager coordinating them.`,

      problem: `Phishing awareness training usually fails in the same way. It shows the learner a clearly-labelled bad email, the learner correctly identifies it, and nothing transfers, because the hard part was never identifying an email already flagged as suspicious. The hard part is noticing the one that is not flagged, in an inbox, while doing something else.

The gap is context. A training example stripped of its surroundings removes exactly the signal the learner needs to practise reading.`,

      solution: `Rebuild the surroundings. PhishSafe implements enough of a desktop environment that the inbox feels like an inbox: the mail app sits alongside a calendar, a news feed and a calculator, each one a working app rather than a backdrop, and the player reaches the emails by opening the mail client like they would at work.

Each email in the dataset carries the phishing verdict as structured data rather than prose (a sender address, a body, a tag, and an \`is_phishing\` flag) alongside a short explanation naming the specific indicator that gives it away: the lookalike domain, the artificial deadline, the financial request, the unexpected shared document. The verdict is data the game checks against, and the explanation is what the player is left with.

A companion repository, EmailFiles, holds a richer JSON schema for the same idea: a difficulty rating, tags, links, attachments with an \`IsMalicious\` flag, an explicit list of indicators, a written explanation, the correct action to take, and a reward value for taking it.`,

      architecture: {
        description:
          "Structured as a small operating system rather than a menu of levels. A global autoload manages state across the session; the login screen hands off to a desktop shell; the desktop launches apps into resizeable windows; each app is self-contained under its own directory with its own scenes and scripts.",
        flow: [
          "Login screen",
          "Global manager (autoload)",
          "Desktop shell",
          "App windows",
          "Mail client",
          "Email dataset & verdicts",
        ],
      },

      capabilities: {
        description: "What is implemented in the project as published.",
        items: [
          "Simulated desktop with a login screen, launchable app items and resizeable windows",
          "Mail client presenting phishing and legitimate messages side by side, each with a sender, subject, preview, body and tag",
          "Per-email phishing verdict held as structured data, with a written explanation of the indicator that identifies it",
          "Supporting apps: calendar, news feed, calculator with history and settings, so the inbox sits in a plausible environment",
          "Per-user accounts and profiles, with generated identifiers and separate work and personal email addresses",
          "User-configurable display, audio and notification settings persisted against the account",
          "A companion JSON email schema (EmailFiles) carrying difficulty, tags, links, attachments, indicators, correct action and reward",
        ],
      },

      technology: [
        { area: "Engine", value: "Godot 4.6, mobile feature set" },
        { area: "Language", value: "GDScript" },
        { area: "Architecture", value: "Autoloaded global manager, scene-per-app, Resource-backed user accounts" },
        { area: "Content", value: "Email datasets in GDScript arrays and standalone JSON" },
        { area: "Target", value: "1920×1080 viewport with canvas-item stretch" },
      ],

      security: {
        description:
          "A phishing trainer is a piece of software that deliberately shows people convincing phishing content, so the safety model matters as much as the lesson.",
        items: [
          "Every message is simulated. Emails carry no live links and no real attachments. An attachment is a filename, an extension and a flag, not a file.",
          "Simulated senders use deliberately non-routable training domains, including an explicit no-phish.com for the legitimate internal mail, so nothing in the content resolves to a real organisation.",
          "Messages that are phishing examples say so in their own body text, so a screenshot taken out of context cannot be mistaken for a real lure.",
          "The verdict and the explanation live beside each message as data, so the training content and the answer key cannot drift apart.",
        ],
      },

      results:
        "The project is published on GitHub as a complete Godot source tree: login, desktop shell, window management, user accounts and profiles, and five working apps including the mail client the training runs through.",
    },

    screenshots: [],

    links: {
      github: "https://github.com/SahilZ1/PhishSafe",
      demo: null,
    },
  },

  {
    slug: "network-intrusion-detection",
    name: "Network Intrusion Detection System",
    tagline: "A Python NIDS that watches live traffic for port scans, traffic spikes and high-risk ports.",
    category: "Network Security",
    draft: false,
    year: "2026",
    status: "Source published on GitHub",
    accent: "threat",

    summary:
      "A network intrusion detection system built from scratch in Python and Scapy: live packet capture or offline PCAP analysis, three windowed detection rules, alerts persisted to SQLite and exportable to CSV, all behind a small command-line interface.",

    tags: ["Python", "Scapy", "SQLite", "PCAP", "Network security", "CLI"],

    sections: {
      overview: `A network intrusion detection system written in Python, built, in the README's own words, to better understand how network-based threats can be detected in real time.

It captures packets from a chosen interface, or reads a saved PCAP file, turns each packet into a normalised network event, and runs that event past three detection rules. Anything that fires becomes an alert with a severity, a source and destination address, and a human-readable explanation of what triggered it. Alerts are written to SQLite and can be exported to CSV.`,

      problem: `Detection tools are easy to use and hard to understand. Running Snort or Suricata teaches you their configuration format; it does not teach you what a port scan actually looks like in a packet stream, or why a detection rule needs a time window and a cooldown at all.

Writing the detector is what surfaces those questions: how many unique ports in how many seconds constitutes a scan, what stops one noisy host generating a thousand identical alerts, what to do with a packet that has no destination port.`,

      solution: `A small, readable pipeline with the detection logic isolated in one place.

Packets arrive through a sniffing engine that wraps Scapy and imports it lazily, so listing the detection rules or reading stored alerts does not require the capture dependency to be present. Each packet becomes a \`NetworkEvent\` dataclass carrying timestamp, source and destination address, protocol, ports, TCP flags and length, and every rule consumes that one normalised shape rather than raw Scapy layers.

The detector holds per-source sliding windows and evaluates three rules against each event. Any alert it produces passes through a shared cooldown keyed on the source address and the rule that fired, which is what stops a single scanning host flooding the alert table with the same finding.`,

      architecture: {
        description:
          "Separated so that capture, detection and storage do not know about each other: the sniffing engine produces events, the detector consumes events and produces alerts, and the database layer persists alerts. The CLI is the only module that wires all three together.",
        flow: [
          "Live interface / PCAP file",
          "Sniff engine (Scapy)",
          "NetworkEvent",
          "Detector rules",
          "Alert + cooldown",
          "SQLite store",
          "CLI / CSV export",
        ],
      },

      capabilities: {
        description: "The three detection rules, with the thresholds actually set in the source.",
        items: [
          "Possible port scan, flagged when one source address contacts 15 or more unique destination ports within a 15-second sliding window. Severity: high.",
          "Traffic spike, flagged when one source sends 120 or more packets within a 10-second sliding window. Severity: high.",
          "Suspicious port access, flagged on traffic to a known high-risk port: FTP (21), Telnet (23), RPC (135), NetBIOS (139), SMB (445), RDP (3389), 4444 (Meterpreter-style) and 5555 (ADB). Severity: medium.",
          "A 20-second cooldown per source-and-rule pair, so one noisy host cannot flood the alert table with duplicates of the same finding",
          "Live capture on a named interface, or offline analysis of a saved PCAP",
          "Alerts persisted to SQLite with timestamp, type, severity, both addresses and detail",
          "CLI subcommands to list interfaces, run live, analyse a PCAP, review recent alerts and export to CSV",
        ],
      },

      technology: [
        { area: "Language", value: "Python 3, with dataclasses and from __future__ annotations" },
        { area: "Capture", value: "Scapy 2.5+, imported lazily so non-capture commands run without it" },
        { area: "Storage", value: "SQLite via the standard library, single indexed alerts table" },
        { area: "Export", value: "CSV through the standard library csv module" },
        { area: "Interface", value: "Command-line: interfaces, live, pcap, alerts, export" },
        { area: "Developed on", value: "macOS with VS Code; Wireshark used alongside for verification" },
      ],

      security: {
        description:
          "A packet sniffer is a privileged tool, and the project is written to keep that privilege narrow and the data local.",
        items: [
          "Live capture requires root, and only the capture path does. Reading stored alerts or exporting CSV runs unprivileged.",
          "Scapy is imported lazily inside the capture functions, so the privileged dependency is never loaded by commands that do not need it.",
          "Every SQL statement is parameterised; alert fields never reach the database through string interpolation.",
          "Captured traffic is not retained. Packets become normalised events, events become alerts, and only alerts are persisted. The payload is never written to disk.",
        ],
      },

      results:
        "The system runs against a live interface or a saved capture and produces severity-tagged alerts for the three rule types, stored in SQLite and exportable to CSV. Detection was verified alongside Wireshark on the same traffic.",
    },

    screenshots: [],

    links: {
      github: "https://github.com/SahilZ1/Network-Intrusion-Detection-System-NIDS-",
      demo: null,
    },
  },

  {
    slug: "splunk-soc-lab",
    name: "Splunk SOC Detection Lab",
    tagline: "A working SIEM lab: Windows telemetry into Splunk, and seven detections built and validated on top of it.",
    category: "SOC / Detection Engineering",
    draft: false,
    year: "2026",
    status: "Lab complete",
    accent: "threat",

    summary:
      "A hands-on security operations lab built on Splunk Enterprise, Windows Event Logs and Sysmon: seven detections covering credential attacks, suspicious execution and privilege changes, each implemented, alerted on and validated against activity generated in the lab.",

    tags: ["Splunk Enterprise", "Sysmon", "Windows Event Logs", "SIEM", "MITRE ATT&CK", "Detection engineering"],

    sections: {
      overview: `A security operations lab built to do the day-to-day work of a SOC analyst rather than read about it: ingest Windows telemetry into a SIEM, write detections against it, fire the activity they are meant to catch, and confirm they actually caught it.

Splunk Enterprise is the SIEM, with Windows Event Logs and Sysmon as the telemetry sources. Seven detections were implemented and validated, spanning credential attacks, suspicious process execution, privilege escalation and persistence-adjacent changes.

The lab also produced an unplanned piece of SIEM administration experience: log ingestion broke partway through, and restoring it meant rebuilding the inputs configuration by hand.`,

      problem: `Detection content is easy to copy and hard to trust. A rule taken from a blog post will run, and it will produce alerts, but running it teaches you nothing about whether it fires on the activity you care about, how often it fires on activity you do not, or what it costs to tune.

The only way to know a detection works is to generate the behaviour it targets and watch it trigger, which requires an environment where generating that behaviour is safe.`,

      solution: `Build the environment, then close the loop on every rule.

Windows Event Logs and Sysmon feed Splunk Enterprise as the telemetry sources, and between them they cover authentication, process creation, registry activity and account management, which is most of what the chosen detections need. Each detection was written as a search, promoted to an alert, then deliberately triggered by performing the activity in the lab and confirmed against the resulting events.

Validating each rule against activity generated on purpose is what turns a search into a detection. It is also what surfaces tuning work: the difference between a rule that fires and a rule that fires on the right thing.`,

      architecture: {
        description:
          "Endpoint telemetry flows from Windows into Splunk through a forwarder configuration, where saved searches back the alerts. The detections sit on top of two complementary sources: native Windows Event Logs for authentication and account management, Sysmon for process and registry detail.",
        flow: [
          "Windows endpoint",
          "Windows Event Logs + Sysmon",
          "inputs.conf ingestion",
          "Splunk Enterprise",
          "Saved searches",
          "Alerts & triage",
        ],
      },

      capabilities: {
        description: "The seven detections implemented and validated in the lab.",
        items: [
          "Failed login attempts, the baseline credential-attack signal",
          "Successful login following multiple failed attempts, the pattern that separates a successful brute force from ordinary mistyping",
          "Suspicious PowerShell execution",
          "New user account creation",
          "User added to the Administrators group, which is privilege escalation via group membership",
          "Registry modifications",
          "Suspicious rundll32 execution, a common living-off-the-land binary",
        ],
      },

      technology: [
        { area: "SIEM", value: "Splunk Enterprise" },
        { area: "Telemetry", value: "Windows Event Logs and Sysmon" },
        { area: "Ingestion", value: "Forwarder inputs.conf, rebuilt by hand after ingestion failed" },
        { area: "Detection", value: "Saved searches promoted to alerts, validated against generated activity" },
        { area: "Frameworks", value: "MITRE ATT&CK and the Cyber Kill Chain" },
        { area: "Environment", value: "Virtualised Windows endpoint, isolated from production" },
      ],

      security: {
        description:
          "The lab generates activity that detections are meant to catch, including failed logins, privilege changes and suspicious execution, so containment matters.",
        items: [
          "All activity is generated inside a virtualised environment built for the exercise, isolated from any production system.",
          "Only the detection logic and findings are published. No telemetry, host detail or configuration from the lab is shared.",
          "Detections were validated by performing the behaviour deliberately, rather than by replaying samples of unknown provenance.",
        ],
      },

      challenges: [
        "Splunk stopped ingesting logs partway through the lab. Diagnosing it came down to the forwarder input configuration, and restoring ingestion meant rebuilding inputs.conf from scratch, which turned an interruption into the most useful SIEM administration experience in the project.",
      ],

      results:
        "Seven detections implemented, alerted on and validated against activity generated in the lab, across credential attacks, suspicious execution, privilege escalation and registry modification, plus a restored ingestion pipeline after diagnosing and rebuilding the forwarder input configuration.",

      lessons: [
        "A detection is not finished when the search returns results. It is finished when you have fired the behaviour on purpose and watched the alert catch it.",
        "Most of a SIEM analyst's time is not spent writing detections. Ingestion, parsing and tuning are the job, and a pipeline that quietly stops is worse than one that loudly breaks.",
        "Detecting a successful login after repeated failures is far more valuable than detecting either signal alone. The sequence is the finding.",
      ],
    },

    screenshots: [],

    links: {
      github: null,
      demo: null,
    },
  },

  {
    slug: "sysmon-reconnaissance-detection",
    name: "Detecting Reconnaissance with Sysmon",
    tagline: "A virtual SOC lab: an Nmap scan run against a Windows host, caught in Sysmon Event ID 3.",
    category: "Blue Team / Detection Engineering",
    draft: false,
    year: "2026",
    status: "Write-up published on GitHub",
    accent: "threat",

    summary:
      "A detection exercise carried out in an isolated virtual lab: a Kali attacker port-scans a Windows 10 target, and the activity is detected and analysed from endpoint Sysmon logs, then mapped to MITRE ATT&CK and written up with remediation recommendations.",

    tags: ["Sysmon", "Nmap", "Kali Linux", "MITRE ATT&CK", "VirtualBox", "Blue team"],

    sections: {
      overview: `A blue-team exercise run end to end in a virtual SOC lab. A simulated attacker on Kali Linux performs an Nmap port scan against a Windows 10 virtual machine, and the scan is then detected and analysed from the target's own Sysmon logs.

The work covers the whole loop rather than just the detection: simulate the activity, find it in the telemetry, establish what the attacker learned, map the behaviour to a known technique, and recommend controls that would catch or prevent it.`,

      problem: `Reconnaissance is the stage of an intrusion most likely to be dismissed as noise. A port scan breaks nothing and triggers no obvious failure, so it is easy to treat as background internet traffic. But it is how an attacker builds the service inventory that every later stage depends on.

Detecting it means knowing what it looks like at the endpoint, in telemetry that is actually collected.`,

      solution: `Build the lab, run the attack, then work the detection backwards from the logs.

Two VirtualBox machines on a host-only network, a Kali attacker and a Windows 10 target running Sysmon, gave a closed environment where every packet on the wire was one of mine. The scan was a TCP connect scan against four ports chosen for being worth an attacker's attention:

    nmap -n -sT -Pn -p 80,135,445,3389 192.168.56.103

Detection then came from Sysmon Event ID 3, which records network connections at the endpoint. The signature of the scan is not any single event, since one connection attempt is unremarkable. It is the pattern across them: the same source address reaching several different ports in quick succession.`,

      architecture: {
        description:
          "A closed two-machine lab on a host-only network, with the detection evidence coming from endpoint telemetry on the target rather than from a network tap.",
        flow: [
          "Kali attacker VM",
          "Host-only network",
          "Windows 10 target VM",
          "Sysmon Event ID 3",
          "Log analysis",
          "MITRE ATT&CK mapping",
        ],
      },

      capabilities: {
        description: "What the exercise established.",
        items: [
          "Attacker source address 192.168.56.102 scanning target 192.168.56.103 across ports 80, 135, 445 and 3389",
          "Multiple connection attempts to different ports in quick succession, the pattern that distinguishes a scan from ordinary traffic",
          "Behaviour mapped to MITRE ATT&CK T1046, Network Service Discovery",
          "Impact assessed: the attacker is building an inventory of exposed services to use at a later stage of the attack lifecycle",
          "Remediation recommended: alert on repeated connection attempts, close unnecessary ports, add firewall rules against unauthorised scanning, and route the telemetry into SIEM or IDS alerting",
        ],
      },

      technology: [
        { area: "Attacker", value: "Kali Linux on VirtualBox" },
        { area: "Target", value: "Windows 10 on VirtualBox" },
        { area: "Telemetry", value: "Sysmon, Event ID 3 (network connection)" },
        { area: "Tooling", value: "Nmap TCP connect scan (-sT -Pn)" },
        { area: "Network", value: "Host-only, isolated from the internet" },
        { area: "Framework", value: "MITRE ATT&CK T1046, Network Service Discovery" },
      ],

      security: {
        description:
          "The exercise involves running an attack tool, so the containment is part of the method rather than an afterthought.",
        items: [
          "Both machines sit on a VirtualBox host-only network, so the scan cannot reach anything outside the lab.",
          "The target is a virtual machine built for the exercise. No production system and no third-party host is scanned at any point.",
          "Only the write-up is published. The lab itself stays local, and nothing in the repository is a runnable attack against a live target.",
        ],
      },

      results:
        "The scan was detected from endpoint telemetry alone, with the attacker's source address, the targeted ports and the scanning pattern all recovered from Sysmon Event ID 3 logs, and the behaviour mapped to a named ATT&CK technique with concrete remediation recommendations.",

      lessons: [
        "Reconnaissance is visible at the endpoint, not just on the wire. Sysmon Event ID 3 was enough to reconstruct the whole scan without a network capture.",
        "A single connection event means nothing. The detection lives in the pattern across events from one source, which is why the rule needs a time window rather than a threshold on one log line.",
      ],
    },

    screenshots: [],

    links: {
      github: "https://github.com/SahilZ1/Detection-of-Reconnaissance-Using-Sysmon",
      demo: null,
    },
  },

  {
    slug: "portfolio-analytics",
    name: "Portfolio Analytics Platform",
    tagline: "A first-party, privacy-conscious web analytics platform, and the one running on this site.",
    category: "Full-stack / Security Engineering",
    draft: false,
    year: "2026",
    status: "Running in production on this site",
    accent: "analytics",

    summary:
      "Rather than adding Google Analytics, this site runs an analytics platform built from scratch: anonymous visitor identity, session reconstruction, page-view and event ingest, journey analysis and a private admin console, all on Node.js, Express and PostgreSQL.",

    tags: ["Node.js", "Express 5", "PostgreSQL 18", "React", "bcrypt", "CSP", "SQL"],

    sections: {
      overview: `Every page you have loaded on this site has been recorded by a system built for it specifically. There is no third-party analytics script anywhere in the page, no external network request, and no data leaves the origin.

The platform tracks what a portfolio owner actually wants to know (which projects get read, where visitors arrive from, how far they get before leaving) while collecting materially less about the visitor than a standard commercial tag would. It is the same problem every analytics vendor solves, solved with the privacy trade-offs chosen deliberately rather than inherited.`,

      problem: `Third-party analytics is the default answer, and it has two problems worth taking seriously.

The first is privacy. A commercial tag typically collects a full User-Agent string, screen and hardware characteristics, precise IP-derived location and a cross-site identifier, then sends all of it to infrastructure the site owner does not control. Most of that is unnecessary to answer "did anyone read my ThreatScope write-up".

The second is that using one demonstrates nothing. A security portfolio that outsources its own instrumentation to a script tag is not evidence of engineering ability.`,

      solution: `A four-level data model of visitor, session, page view and event, with an ingest API, an aggregation layer and an authenticated console on top.

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
          "Traffic-source attribution from referrers: Google, LinkedIn, GitHub, search, referral, direct",
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
        { area: "Charts", value: "Hand-built SVG primitives, no chart library" },
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
        "The original visitor middleware wrote to PostgreSQL on every HTTP request, including every asset and favicon probe, so a single page load produced dozens of writes and rewrote last_seen from asset traffic. Moving all database work to the ingest endpoints reduced it to one write path per real navigation.",
        "Raw User-Agent strings were being stored. A full UA is a meaningful fingerprinting component and the dashboard only needs three coarse answers from it, so classification moved to ingest time and the column was dropped rather than left dormant.",
        "Letting a language model describe analytics invites invented statistics. The fix was to verify output rather than trust it: every number in a generated insight is checked against the source aggregates, and any sentence containing a figure that is not in the data is discarded before it reaches the screen.",
      ],

      results:
        "The platform is live on this site and is the source of every figure in the admin console. Concrete outcomes: no third-party requests on any page, no raw IP addresses stored anywhere, raw User-Agent strings never persisted, and a documented retention window that is actually enforced by a scheduled job rather than merely promised.",

      lessons: [
        "Privacy decisions are mostly schema decisions. Choosing not to store a column is a far stronger control than choosing not to look at it.",
        "Denormalised counters on the session row removed correlated subqueries from nearly every dashboard aggregate, and that is worth the write cost many times over.",
        "An AI feature is only as trustworthy as its verification step. Grounding output in checked data matters more than the prompt.",
      ],
    },

    screenshots: [],

    links: {
      github: "https://github.com/SahilZ1/Portfolio",
      demo: null,
    },
  },
  {
    slug: "threatscope",
    name: "ThreatScope",
    tagline: "A threat intelligence aggregation and enrichment pipeline, currently being built.",
    category: "Threat Intelligence",
    /** `draft: true` renders a visible “in progress” banner. */
    draft: true,
    year: "2026",
    status: "In progress",
    accent: "threat",

    /** Shown on the index card. Keep to two sentences. */
    summary:
      "ThreatScope pulls indicators from open threat intelligence feeds, normalises them into one shape and enriches them so an analyst can judge an indicator without opening five tabs. It is in active development, and this page will be written up properly once there is something worth reading rather than something worth promising.",

    tags: ["Python", "PostgreSQL", "Threat intelligence", "In progress"],

    sections: {
      overview: `ThreatScope is the project I am building at the moment, so this entry is deliberately short.

The idea is straightforward: open threat intelligence is plentiful and badly shaped. Feeds disagree on format, on confidence, and on what an indicator even is, and the work of reconciling them falls on whoever is doing the triage. ThreatScope is an attempt to do that reconciliation once, in a pipeline, rather than every time an indicator comes up.

The rest of this case study stays empty until the system does what the summary says it does. Every other project on this site is written from code that exists, and this one will be too.`,
    },

    screenshots: [],

    links: {
      github: null,
      demo: null,
    },
  },

];

/**
 * Smaller repositories, listed rather than written up.
 *
 * These are real and public, but they are utilities and coursework rather than
 * case studies. Listing them honestly as "also on GitHub" is more useful than
 * inflating a sixty-line script into an eleven-section case study.
 */
export const otherRepositories = [
  {
    name: "Password-Gen",
    description:
      "A Python password generator built on the standard library, mixing letters, digits and symbols at a configurable length.",
    language: "Python",
    url: "https://github.com/SahilZ1/Password-Gen",
  },
  {
    name: "EmailFiles",
    description:
      "The phishing-email dataset behind PhishSafe: JSON records carrying difficulty, sender, body, attachments, indicators, an explanation and the correct action.",
    language: "JSON",
    url: "https://github.com/SahilZ1/EmailFiles",
  },
  {
    name: "Project",
    description:
      "A scheduled WhatsApp reminder script using pywhatkit and pyautogui, with an optional email notification path.",
    language: "Python",
    url: "https://github.com/SahilZ1/Project",
  },
];

export const getProject = (slug) => projects.find((project) => project.slug === slug);
