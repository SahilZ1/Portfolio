/**
 * Cyber Lab write-ups.
 *
 * ---------------------------------------------------------------------------
 * SAFETY MODEL — read before adding a lab
 * ---------------------------------------------------------------------------
 * This file contains *write-ups only*. It is prose, diagrams and findings. It
 * contains no exploitable endpoint, no vulnerable route, and no code path that
 * a visitor to the public site can trigger.
 *
 * That separation is deliberate and must be maintained:
 *
 *   PUBLIC  (this site)          the write-up: what was tested, what was
 *                                found, what was fixed, what was learned.
 *
 *   PRIVATE (local / isolated)   the deliberately vulnerable application the
 *                                finding came from. It runs on localhost or in
 *                                an isolated VM or container, is never exposed
 *                                to the internet, and is never deployed as part
 *                                of this site.
 *
 * A portfolio that hosts live vulnerable endpoints is not demonstrating
 * security skill; it is demonstrating the absence of it, and it puts the rest
 * of the site at risk. If a future lab needs a runnable demonstration, keep it
 * in a separate repository with its own README stating the isolation
 * requirements, and link to it — do not mount it here.
 *
 * The three labs below document controls that are genuinely implemented in this
 * application, so the findings and remediations are verifiable against the
 * source rather than illustrative.
 * ---------------------------------------------------------------------------
 */

import { TODO } from "./site.js";

export const labCategories = [
  { id: "web", label: "Web Application Security" },
  { id: "auth", label: "Authentication & Session Security" },
  { id: "headers", label: "Security Headers & Hardening" },
  { id: "network", label: "Network & Traffic Analysis" },
  { id: "code", label: "Secure Coding" },
];

export const labs = [
  {
    slug: "session-cookie-security",
    title: "Cookie and session security under real constraints",
    category: "auth",
    categoryLabel: "Authentication & Session Security",
    status: "complete",
    date: "2026",
    /** Where the work was actually carried out. Shown on the page. */
    environment: "This application, on localhost — a system I own and built.",
    summary:
      "Two cookies on one origin with opposite jobs: an anonymous analytics identifier that must survive a cross-site arrival, and an admin session id that must never travel cross-site at all. Getting SameSite right meant treating them differently.",

    objective:
      "Determine the correct cookie attributes for each of the two cookies this application sets, rather than applying one policy to both, and verify the result against actual browser behaviour.",

    approach: [
      "Enumerated every cookie the application sets and what each one authorises.",
      "Worked out the attack each attribute defends against, and what each one costs in functionality.",
      "Set the attributes per-cookie and inspected the live Set-Cookie headers with curl -I and the browser's storage inspector.",
      "Checked that a cross-site navigation from an external referrer still carried the analytics cookie, and that the admin cookie did not.",
    ],

    findings: [
      {
        severity: "design",
        title: "SameSite=Strict on the analytics cookie would silently destroy attribution",
        detail:
          "Strict withholds the cookie on a top-level navigation from another site. A visitor arriving from LinkedIn would be issued a second identifier, be counted as a new visitor, and the referrer would be attributed to a session that had just been created — quietly corrupting exactly the figure the cookie exists to produce. Lax sends it on top-level navigations while still withholding it from cross-site subrequests, which is the correct trade-off for an identifier that authorises nothing.",
      },
      {
        severity: "fixed",
        title: "The analytics identifier did not need to be readable by JavaScript",
        detail:
          "The tracking client never reads the cookie — it travels automatically on a same-origin fetch and the server resolves identity from it. Leaving it script-readable would hand any XSS payload a stable cross-visit identifier for nothing in return. It is HttpOnly.",
      },
      {
        severity: "fixed",
        title: "An authenticated session id issued before login is a fixation vector",
        detail:
          "If the session id in the browser before authentication is still the session id after it, an attacker who can plant a known id in a victim's browser holds a valid admin session once that victim logs in. The session is now regenerated at the exact moment privileges change, and the CSRF token is reissued with it.",
      },
      {
        severity: "note",
        title: "Secure is environment-dependent and must not be hard-coded either way",
        detail:
          "Hard-coding Secure=true breaks local development over HTTP; hard-coding it false ships a session id in cleartext. It is derived from NODE_ENV, and production boot additionally refuses to start with a development session secret.",
      },
    ],

    remediation: [
      "portfolio_visitor: HttpOnly, SameSite=Lax, Secure in production, 365-day expiry, random v4 UUID with no derived component.",
      "portfolio_admin_sid: HttpOnly, SameSite=Strict, Secure in production, 8-hour rolling expiry, server-side state in PostgreSQL.",
      "Session id regenerated on login; session row deleted server-side on logout rather than only clearing the cookie.",
      "Double-submit CSRF token layered beneath SameSite=Strict, so the protection does not rest on one browser behaviour.",
    ],

    lessons: [
      "There is no single correct SameSite value. The right answer depends on what the cookie authorises and where it legitimately needs to arrive from.",
      "Clearing a cookie is not a logout. Until the server-side session row is gone, a captured id is still valid.",
      "Security attributes that differ between environments belong in configuration with a production assertion, not in a conditional someone will eventually invert.",
    ],

    references: [
      { label: "OWASP Session Management Cheat Sheet", note: "Session fixation and rotation guidance" },
      { label: "RFC 6265bis", note: "Cookie attribute semantics, including SameSite" },
    ],
  },

  {
    slug: "security-headers",
    title: "Building a Content Security Policy that is actually strict",
    category: "headers",
    categoryLabel: "Security Headers & Hardening",
    status: "complete",
    date: "2026",
    environment: "This application, on localhost — a system I own and built.",
    summary:
      "Most deployed CSPs contain 'unsafe-inline' on script-src, which removes nearly all of the protection. This lab documents getting a React SPA to run under a policy that does not.",

    objective:
      "Ship a Content Security Policy with no script-src exemptions, and understand precisely which directive defends against which attack instead of copying a policy from a blog post.",

    approach: [
      "Started from deny-all (useDefaults: false) and added only directives the built application provably needed.",
      "Loaded every route with the console open and resolved each violation report individually.",
      "Separated the development policy from the production one, so Vite's HMR requirements never weaken what ships.",
      "Verified the deployed headers with curl -D and an external header scanner.",
    ],

    findings: [
      {
        severity: "design",
        title: "'unsafe-inline' on script-src defeats the point of having a CSP",
        detail:
          "It is the most common exemption in deployed policies and it re-permits exactly the injected inline script a CSP exists to stop. A Vite production build emits external script files only, so the exemption was never actually required — it is usually inherited from a template rather than needed.",
      },
      {
        severity: "accepted",
        title: "'unsafe-inline' on style-src was accepted, with reasoning",
        detail:
          "React and Framer Motion set inline styles for animated transforms. Inline styles cannot execute code, so the residual risk is CSS-based exfiltration and UI redressing rather than script execution. Removing it would mean abandoning transform-based animation or introducing per-request nonces into the render path. The trade was taken deliberately and is recorded here rather than left silent.",
      },
      {
        severity: "fixed",
        title: "connect-src is the directive that actually blocks exfiltration",
        detail:
          "Locking connect-src to 'self' means that even in the event of successful script injection, the payload cannot POST collected data to an attacker-controlled host. It is an underused directive and arguably the highest-value one on a site that handles analytics data.",
      },
      {
        severity: "fixed",
        title: "frame-ancestors, base-uri and object-src were all missing from the default",
        detail:
          "frame-ancestors 'none' prevents clickjacking and supersedes X-Frame-Options. base-uri 'self' stops an injected <base> tag redirecting every relative URL on the page. object-src 'none' removes plugin-based script execution. All three are cheap and none of them broke anything.",
      },
    ],

    remediation: [
      "script-src 'self' — no 'unsafe-inline', no 'unsafe-eval', in production.",
      "connect-src 'self' — the tracking beacon has no legitimate external destination.",
      "frame-ancestors 'none', object-src 'none', base-uri 'self', form-action 'self'.",
      "Referrer-Policy: strict-origin-when-cross-origin, so internal paths stay out of other sites' logs.",
      "HSTS with a one-year max-age and includeSubDomains, enabled only in production over real HTTPS.",
      "X-Powered-By disabled; server framework not advertised in response headers.",
    ],

    lessons: [
      "Start from deny-all and add what breaks. Starting from a permissive default and removing things ends with a policy nobody can justify line by line.",
      "An exemption you can explain is fine. An exemption you inherited is a finding.",
      "Development and production need different policies, and mixing them is how 'unsafe-inline' reaches production.",
    ],

    references: [
      { label: "MDN Content-Security-Policy", note: "Directive reference" },
      { label: "OWASP Secure Headers Project", note: "Baseline header set" },
    ],
  },

  {
    slug: "authentication-hardening",
    title: "Hardening a single-administrator login against realistic attack",
    category: "auth",
    categoryLabel: "Authentication & Session Security",
    status: "complete",
    date: "2026",
    environment: "This application, on localhost — a system I own and built.",
    summary:
      "One account, one login form, and a public internet address. The realistic attacks are brute force, credential stuffing and username enumeration — including enumeration through response timing rather than response text.",

    objective:
      "Make the admin login resistant to automated attack, and confirm that no observable property of a failed response reveals whether the submitted username exists.",

    approach: [
      "Modelled the attacks that actually apply to a single-account console, and discounted the ones that do not.",
      "Implemented layered throttling: per-IP rate limiting for the fast case, per-account lockout for the distributed one.",
      "Compared response bodies, status codes and response times for a valid username with a wrong password against a username that does not exist.",
      "Confirmed that authorisation is enforced at the router, not per-handler, so a new endpoint cannot be added unprotected.",
    ],

    findings: [
      {
        severity: "fixed",
        title: "Response timing enumerated usernames even with identical response text",
        detail:
          "A submitted username that does not exist returns without any password verification, in microseconds. A real one costs a full bcrypt comparison, around 250ms at cost factor 12. That difference is reliably measurable over a network and is a working enumeration oracle regardless of how carefully the error message is worded. The fix is to compare against a dummy bcrypt hash on the no-such-user path so both branches do the same work.",
      },
      {
        severity: "fixed",
        title: "Per-IP rate limiting alone does not stop a distributed attempt",
        detail:
          "An attacker with many source addresses stays under any per-IP threshold. A per-account failure counter with a timed lockout throttles the account regardless of where attempts originate. Both layers are needed; neither is sufficient alone.",
      },
      {
        severity: "fixed",
        title: "Trusting all proxy headers would have bypassed the rate limiter entirely",
        detail:
          "Express's `trust proxy: true` makes the application believe any X-Forwarded-For value a client sends, so an attacker rotates a header field and every IP-keyed limit becomes decorative. It is set to a specific hop count instead.",
      },
      {
        severity: "design",
        title: "No account creation endpoint exists, by design",
        detail:
          "A self-service registration route on an admin console is an open door, and 'first user to register wins' is a race anyone who finds the site early can win. Account creation requires shell access to the server via a CLI that reads the password with echo disabled and stores only the bcrypt hash.",
      },
    ],

    remediation: [
      "bcrypt at cost factor 12, configurable; password policy weighted to length over character classes, following NIST SP 800-63B.",
      "Per-IP rate limiting that does not count successful logins, so the legitimate admin is never locked out by their own activity.",
      "Per-account lockout after 10 failures, for 15 minutes.",
      "Constant-time dummy hash comparison on every failure path, including locked and inactive accounts.",
      "One identical error message and status code for every failure; the specific reason is written to an audit table instead.",
      "Login attempts audited with HMAC-hashed source addresses — enough to correlate a burst, not reversible to an address from a database dump.",
      "requireAdmin applied once at the router level rather than per handler.",
    ],

    lessons: [
      "Enumeration is not only about error text. Timing, status codes and response size all leak, and timing is the one that gets forgotten.",
      "Layer throttles against different attacker shapes. Per-IP handles the fast attacker; per-account handles the patient distributed one.",
      "The most effective control here was removing a feature: there is no registration endpoint to attack.",
    ],

    references: [
      { label: "OWASP Authentication Cheat Sheet", note: "Enumeration and lockout guidance" },
      { label: "NIST SP 800-63B", note: "Password policy: length over composition rules" },
    ],
  },
];

/**
 * Labs that are planned but not yet done.
 *
 * Listed separately and clearly labelled, so the roadmap is visible without a
 * visitor mistaking an intention for completed work.
 */
export const plannedLabs = [
  {
    title: "Reflected and stored XSS in an isolated target",
    category: "web",
    categoryLabel: "Web Application Security",
    note: TODO("Describe the isolated target you will use. The vulnerable app must stay local — link out, never mount it here."),
  },
  {
    title: "CSRF against a deliberately unprotected form",
    category: "web",
    categoryLabel: "Web Application Security",
    note: TODO("Which isolated target, and what the write-up will demonstrate."),
  },
  {
    title: "SQL injection: exploitation and parameterised remediation",
    category: "code",
    categoryLabel: "Secure Coding",
    note: TODO("Which isolated target, and what the write-up will demonstrate."),
  },
  {
    title: "Traffic analysis of the analytics beacon",
    category: "network",
    categoryLabel: "Network & Traffic Analysis",
    note: TODO("Capture this site's own beacon traffic and document exactly what is on the wire — a strong companion to the privacy page."),
  },
];

export const getLab = (slug) => labs.find((lab) => lab.slug === slug);
