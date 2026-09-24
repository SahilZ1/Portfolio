import { useState } from "react";
import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { analytics } from "../lib/analytics.js";

/**
 * Privacy and analytics disclosure.
 *
 * Written to be genuinely useful rather than legally defensive. It states what
 * is collected field by field, what is deliberately NOT collected, why each
 * cookie has the settings it has, and where the assumptions and limits lie.
 *
 * It does not claim compliance with any particular regime, because that depends
 * on where the site is operated and who visits, and an unqualified compliance
 * claim on a personal site is usually wrong.
 */

/** Exactly what is stored, per table. Mirrors the actual schema. */
const COLLECTED = [
  {
    group: "Visitor",
    purpose: "Recognising a repeat visit, so returning-visitor figures mean something.",
    fields: [
      ["A random identifier", "A v4 UUID from the platform random number generator. Derived from nothing about you."],
      ["First seen / last seen", "Timestamps."],
      ["Session count", "How many visits this identifier has made."],
    ],
  },
  {
    group: "Session",
    purpose: "Reconstructing a single visit: where it started, where it came from, where it ended.",
    fields: [
      ["Start, last activity, end", "Timestamps. A visit ends after 30 minutes of inactivity."],
      ["Entry and exit page", "The first and last page paths of the visit."],
      ["Referrer", "The origin and path that linked here, with the query string removed. Often absent entirely."],
      ["Traffic source", "A bucket derived from the referrer: Google, LinkedIn, GitHub, search, referral, or direct."],
      ["Device category", "One of: desktop, mobile, tablet, unknown."],
      ["Browser family", "A name only — “Chrome”, “Safari”. No version."],
      ["Operating system family", "A name only — “Windows”, “iOS”. No version."],
    ],
  },
  {
    group: "Page view",
    purpose: "Knowing which pages are read, and in what order.",
    fields: [
      ["Path", "The page path, with query string and fragment removed."],
      ["Page title", "The document title."],
      ["Time viewed and position in visit", "A timestamp and a sequence number."],
      ["Time on page", "Seconds until the next page view, capped at one hour."],
    ],
  },
  {
    group: "Event",
    purpose: "Knowing which links and buttons get used.",
    fields: [
      ["Event type", "From a fixed list — outbound click, CTA press, résumé download, and similar."],
      ["Page path", "Where on this site the interaction happened."],
      ["Small metadata object", "For an outbound click, only the destination hostname — never the full URL."],
    ],
  },
];

/** The explicit not-collected list. */
const NOT_COLLECTED = [
  "Your IP address. It is never written to the database. It is used transiently, in memory, only for rate limiting.",
  "Your full User-Agent string. It is classified into three coarse families at the moment of arrival and then discarded.",
  "Any device fingerprint. No canvas, WebGL, audio, font enumeration, hardware probing, or screen measurement.",
  "Your name, email address, or any other identifying information — the site never asks for it.",
  "Any cookie other than the two this site sets itself. Other cookies are never read.",
  "Anything from a third-party tracker, because there is not one. No Google Analytics, no tag manager, no external script, no external network request of any kind.",
  "Precise location. There is no geolocation lookup, at any resolution.",
];

const COOKIES = [
  {
    name: "portfolio_visitor",
    purpose: "Counts visits. Holds a random identifier and nothing else.",
    settings: [
      ["HttpOnly", "JavaScript on the page cannot read it, so a script injection could not steal it."],
      ["SameSite=Lax", "Sent when you navigate here from another site, so arrivals are attributed correctly — but not on cross-site subrequests."],
      ["Secure", "In production only: never transmitted over unencrypted HTTP."],
      ["365 days", "Long enough for returning-visitor analysis to be meaningful."],
    ],
  },
  {
    name: "portfolio_admin_sid",
    purpose: "Only ever set for the site owner, after signing in to the private analytics console. A normal visitor never receives it.",
    settings: [
      ["HttpOnly", "Unreadable by JavaScript."],
      ["SameSite=Strict", "Never sent on any cross-site request at all — a CSRF control."],
      ["Secure", "In production only."],
      ["8 hours, rolling", "Expires on inactivity; the session is stored server-side and destroyed on sign-out."],
    ],
  },
];

function OptOut() {
  const [state, setState] = useState("idle");

  const optOut = async () => {
    setState("working");
    await analytics.optOut();
    setState("done");
  };

  return (
    <div className="optout">
      <div>
        <h3 className="title-s">Opt out</h3>
        <p className="muted">
          This clears your identifier from your browser and stops any further recording. Your next
          visit cannot be linked to this one. There is no dark pattern here — one button, and it
          works.
        </p>
      </div>
      <div className="optout__action">
        {state === "done" ? (
          <p className="optout__done">
            <span className="optout__tick" aria-hidden="true" />
            Identifier cleared. Nothing further will be recorded.
          </p>
        ) : (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={optOut}
            disabled={state === "working"}
          >
            {state === "working" ? "Clearing…" : "Opt out of analytics"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Privacy() {
  return (
    <>
      <Seo
        title="Privacy & analytics"
        path="/privacy"
        description="Exactly what this site's first-party analytics collects, what it deliberately does not collect, how the cookies are configured and why, and how to opt out."
      />
      <PageHeader
        eyebrow="Privacy"
        title="Exactly what this site records"
        lede="This site runs analytics it built itself. Here is every field it stores, everything it deliberately does not, and a working opt-out."
      />

      <section className="section">
        <div className="shell shell--wide privacy">
          <Reveal>
            <div className="privacy__summary">
              <p>
                <strong>The short version.</strong> One first-party cookie holds a random number so
                repeat visits can be counted. The pages you open and the links you click are
                recorded against it. No third party is involved, nothing leaves this server, your
                IP address is never stored, and no fingerprint is taken.
              </p>
            </div>
          </Reveal>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">What is collected</h2>
            </Reveal>
            <RevealGroup className="privacy__groups" gap={0.06}>
              {COLLECTED.map((group) => (
                <RevealItem key={group.group} className="privacy__group">
                  <h3 className="title-s">{group.group}</h3>
                  <p className="privacy__purpose muted">{group.purpose}</p>
                  <dl className="privacy__fields">
                    {group.fields.map(([field, detail]) => (
                      <div key={field}>
                        <dt>{field}</dt>
                        <dd>{detail}</dd>
                      </div>
                    ))}
                  </dl>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">What is deliberately not collected</h2>
              <p className="lede">
                This list matters more than the one above. These are choices, not omissions.
              </p>
            </Reveal>
            <RevealGroup as="ul" className="privacy__never" gap={0.04}>
              {NOT_COLLECTED.map((item, index) => (
                <RevealItem as="li" key={index}>
                  <span className="privacy__cross" aria-hidden="true" />
                  <span>{item}</span>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Cookies, and why each setting is there</h2>
            </Reveal>
            <RevealGroup className="privacy__cookies" gap={0.06}>
              {COOKIES.map((cookie) => (
                <RevealItem key={cookie.name} className="privacy__cookie">
                  <code className="privacy__cookie-name">{cookie.name}</code>
                  <p className="muted">{cookie.purpose}</p>
                  <dl className="privacy__fields">
                    {cookie.settings.map(([setting, why]) => (
                      <div key={setting}>
                        <dt className="mono">{setting}</dt>
                        <dd>{why}</dd>
                      </div>
                    ))}
                  </dl>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Retention</h2>
              <div className="prose">
                <p>
                  Analytics records are deleted after 400 days. This is enforced by a scheduled job
                  that deletes expired visitor records, which cascades to their sessions, page
                  views and events — not merely stated as an intention.
                </p>
                <p>
                  Sign-in attempts to the private console are recorded for security auditing. Those
                  records store a keyed hash of the source address rather than the address itself,
                  which is enough to recognise a burst of attempts from one source but not
                  reversible to an address by anyone holding only the database.
                </p>
              </div>
            </Reveal>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Do Not Track and Global Privacy Control</h2>
              <p className="prose">
                Both are honoured. If your browser sends either signal, the tracking client stops
                before making any request — nothing is recorded at all. Most commercial analytics
                ignores these signals; honouring them costs one condition in the code.
              </p>
            </Reveal>
          </section>

          <Reveal>
            <OptOut />
          </Reveal>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Assumptions and limits</h2>
              <div className="prose privacy__limits">
                <p>
                  <strong>This is not a legal compliance statement.</strong> Whether a jurisdiction
                  requires prior consent for first-party analytics depends on where the site is
                  operated and who visits it. This page describes what the software actually does;
                  it does not assert compliance with GDPR, the ePrivacy Directive, CCPA or any
                  other regime, and it is not legal advice.
                </p>
                <p>
                  <strong>The identifier is pseudonymous, not anonymous.</strong> It is random and
                  derived from nothing about you, but it is stable across visits from the same
                  browser, which is what makes returning-visitor counts possible. Under some
                  definitions that makes it personal data. It is described here as pseudonymous
                  rather than claimed to be anonymous, because that is the accurate word.
                </p>
                <p>
                  <strong>The figures are approximate.</strong> Clearing cookies, a private window,
                  or a different browser all produce a new identifier. The deliberate choice not to
                  fingerprint means the numbers under-count returning visitors. That inaccuracy is
                  the intended trade.
                </p>
                <p>
                  <strong>Server logs.</strong> The hosting platform may keep its own request logs,
                  including IP addresses, outside this application's control. That is standard for
                  any web host and is separate from the analytics described here.
                </p>
                <p>
                  <strong>AI analysis.</strong> The private console can optionally pass aggregated
                  statistics — counts, rates and page paths — to a language model to generate
                  commentary. Individual records are never included, and the feature is disabled
                  unless a provider is explicitly configured.
                </p>
              </div>
            </Reveal>
          </section>
        </div>
      </section>
    </>
  );
}
