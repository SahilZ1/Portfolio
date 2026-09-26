import { useState } from "react";
import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text, isReal } from "../components/Todo.jsx";
import { site } from "../content/site.js";
import { analytics } from "../lib/analytics.js";

/**
 * Privacy and analytics disclosure.
 *
 * Written to be genuinely useful rather than legally defensive. It states what
 * is collected field by field, what is deliberately NOT collected, why each
 * cookie has the settings it has, and where the assumptions and limits lie.
 *
 * The Australian section sets out the position under the Privacy Act 1988 (Cth)
 * honestly: a personal portfolio operated by an individual is almost certainly
 * not an APP entity, so the Act very likely does not bind this site at all. The
 * page says that plainly and then commits to the Australian Privacy Principles
 * anyway, which is a stronger and more accurate position than asserting a
 * compliance that was never required. It is not legal advice.
 *
 * One wording rule, worth keeping: this page must never say the analytics data
 * is "not stored". It is stored — in this application's own PostgreSQL, for a
 * documented 400 days. The commitment that matters, and the one that is true,
 * is that it is never sold and never disclosed to anyone.
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
      ["Browser family", "A name only: “Chrome”, “Safari”. No version."],
      ["Operating system family", "A name only: “Windows”, “iOS”. No version."],
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
      ["Event type", "From a fixed list: outbound click, CTA press, project view, and similar."],
      ["Page path", "Where on this site the interaction happened."],
      ["Small metadata object", "For an outbound click, only the destination hostname, never the full URL."],
    ],
  },
];

/** The explicit not-collected list. */
const NOT_COLLECTED = [
  "Your IP address. It is never written to the database. It is used transiently, in memory, only for rate limiting.",
  "Your full User-Agent string. It is classified into three coarse families at the moment of arrival and then discarded.",
  "Any device fingerprint. No canvas, WebGL, audio, font enumeration, hardware probing, or screen measurement.",
  "Your name, email address, or any other identifying information. The site never asks for it.",
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
      ["SameSite=Lax", "Sent when you navigate here from another site, so arrivals are attributed correctly, but not on cross-site subrequests."],
      ["Secure", "In production only: never transmitted over unencrypted HTTP."],
      ["365 days", "Long enough for returning-visitor analysis to be meaningful."],
    ],
  },
  {
    name: "portfolio_admin_sid",
    purpose: "Only ever set for the site owner, after signing in to the private analytics console. A normal visitor never receives it.",
    settings: [
      ["HttpOnly", "Unreadable by JavaScript."],
      ["SameSite=Strict", "Never sent on any cross-site request at all, which is a CSRF control."],
      ["Secure", "In production only."],
      ["8 hours, rolling", "Expires on inactivity; the session is stored server-side and destroyed on sign-out."],
    ],
  },
];

/**
 * The handling commitments, stated positively.
 *
 * Each of these is checkable against the source of this site rather than being
 * a promise the reader has to take on trust.
 */
const COMMITMENTS = [
  "Your data is never sold. There is no commercial arrangement of any kind attached to this site, and no circumstance in which analytics data is offered, licensed or traded.",
  "Your data is never disclosed, exchanged or shared with any other person, business or advertising network. No third-party analytics, no tag manager, no advertising pixel, no data broker, no external script of any kind.",
  "Your data is used for exactly two purposes: improving this website, and letting the site owner see which pages are read most. It is not used for advertising, profiling, scoring, automated decision-making, or building a profile of you as a person.",
  "Your data stays on this site's own infrastructure. It is written to this application's own database and read back only by the private admin console, which one person can sign in to.",
  "Your data is deleted after 400 days by a scheduled job that actually runs, not by a policy that merely says so.",
  "No marketing, ever. The site collects no email address, sends no email, and operates no mailing list.",
];

/** How the Australian Privacy Principles are applied here, principle by principle. */
const APP_ALIGNMENT = [
  ["APP 1: Open and transparent management", "This page is the policy. It lists every stored field, every cookie and every setting, and names the purposes the data is put to."],
  ["APP 3: Collection of solicited personal information", "Only what is needed to count visits and see which pages are read. No name, email, address, phone number or account is collected, because the site never asks for one."],
  ["APP 5: Notification of collection", "This page is linked from the footer of every page on the site, and a notice appears on a first visit."],
  ["APP 6: Use and disclosure", "Used only for the two purposes above. Disclosed to nobody. The only exceptions are the two infrastructure matters named in the limits section below."],
  ["APP 7: Direct marketing", "Not applicable. The site does no direct marketing and holds no contact details to do it with."],
  ["APP 8: Cross-border disclosure", "The site is hosted on infrastructure operated by an overseas provider. See the limits section for what that means in practice."],
  ["APP 11: Security of personal information", "Parameterised SQL throughout, a strict Content Security Policy, bcrypt password hashing, rate limiting and account lockout on the console, and HttpOnly cookies."],
  ["APP 11.2: Destruction or de-identification", "The 400-day retention window is enforced by a scheduled prune job, which deletes expired visitor records and cascades to their sessions, page views and events."],
  ["APP 12 & 13: Access and correction", "You can request access to, or correction of, anything held against your identifier. See the note on what that involves in practice."],
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
          visit cannot be linked to this one. There is no dark pattern here. One button, and it
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
                recorded against it, stored in this site&rsquo;s own database, and used for two
                things only: improving the site, and letting me see which pages are read most.
              </p>
              <p>
                <strong>It is never sold, and never shared with anyone.</strong> No third-party
                analytics, no advertising network, no data broker. Your IP address is never stored,
                no fingerprint is taken, and everything is deleted after 400 days.
              </p>
            </div>
          </Reveal>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">How your data is handled</h2>
              <p className="lede">
                Six commitments. Each one is checkable against the source of this site.
              </p>
            </Reveal>
            <RevealGroup as="ul" className="privacy__never privacy__commitments" gap={0.04}>
              {COMMITMENTS.map((item, index) => (
                <RevealItem as="li" key={index}>
                  <span className="privacy__check" aria-hidden="true" />
                  <span>{item}</span>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Your privacy under Australian law</h2>
              <div className="prose">
                <p>
                  This site is operated from Sydney, New South Wales, by one person, as a personal
                  portfolio. The relevant law is the <strong>Privacy Act 1988 (Cth)</strong> and
                  the thirteen <strong>Australian Privacy Principles</strong> in Schedule 1 of that
                  Act.
                </p>
                <p>
                  <strong>
                    Whether the Act binds this site is doubtful, and it is handled as though it
                    does.
                  </strong>{" "}
                  The Privacy Act applies to &ldquo;APP entities&rdquo;, and small business
                  operators with an annual turnover of $3 million or less are generally excluded by
                  section 6D. A personal portfolio with no turnover almost certainly falls outside
                  the Act entirely. Rather than rely on that exemption, this site is run to the
                  Australian Privacy Principles anyway &mdash; the commitments above go further
                  than the Act would require in several places, particularly on disclosure and
                  retention.
                </p>
                <p>
                  <strong>
                    Most of what is collected here is probably not personal information at all.
                  </strong>{" "}
                  Under section 6(1) of the Act, personal information means information about an
                  identified individual, or one who is reasonably identifiable. The identifier this
                  site stores is a random number generated by the server, connected to no name, no
                  email address, no account and no IP address. There is nothing held here that
                  could reasonably identify you. It is still treated as though it were personal
                  information, because it is stable across your visits and that is the cautious
                  reading.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <h3 className="title-s privacy__subhead">The principles, applied</h3>
              <dl className="privacy__fields privacy__apps">
                {APP_ALIGNMENT.map(([principle, detail]) => (
                  <div key={principle}>
                    <dt>{principle}</dt>
                    <dd>{detail}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={0.08}>
              <h3 className="title-s privacy__subhead">Access, correction and complaints</h3>
              <div className="prose">
                <p>
                  Under APP 12 and APP 13 you can ask what is held against your identifier, ask for
                  it to be corrected, or ask for it to be deleted outright. The practical
                  difficulty is a consequence of the privacy design rather than an evasion: the
                  site holds nothing that identifies you, so there is no way to look you up by
                  name. Your identifier sits in an HttpOnly cookie your browser will not let a
                  script read, so the realistic options are to read it from your browser&rsquo;s
                  cookie inspector and quote it, or simply to use the opt-out button below, which
                  clears it and stops any further recording immediately.
                </p>
                <p>
                  Privacy enquiries and complaints go to{" "}
                  {isReal(site.links.email) ? (
                    <a href={`mailto:${site.links.email}`}>{site.links.email}</a>
                  ) : (
                    <Text value={site.links.email} />
                  )}
                  . I will acknowledge a complaint within 7 days and respond substantively within
                  30 days, which is the timeframe the Australian Privacy Principles set for an APP
                  entity.
                </p>
                <p>
                  If you are not satisfied with the response, you can complain to the{" "}
                  <strong>Office of the Australian Information Commissioner</strong>, the national
                  privacy regulator, at oaic.gov.au or on 1300 363 992.
                </p>
                <p>
                  <strong>Data breaches.</strong> The Notifiable Data Breaches scheme in Part IIIC
                  of the Privacy Act requires eligible breaches to be reported to the OAIC and to
                  affected individuals. Since this site holds no contact details, notifying you
                  individually would not be possible &mdash; so in the event of a breach affecting
                  analytics data, a notice would be published on this page and the OAIC notified.
                </p>
              </div>
            </Reveal>
          </section>

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
                  views and events, not merely stated as an intention.
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
                before making any request, so nothing is recorded at all. Most commercial analytics
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
                  <strong>This page is not legal advice.</strong> It sets out the Australian
                  position above, and describes what the software actually does. It makes no claim
                  about the GDPR, the ePrivacy Directive, the CCPA or any other overseas regime,
                  which may impose requirements &mdash; prior consent for analytics cookies, in
                  particular &mdash; that this site does not attempt to meet.
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
                  <strong>Server logs, and the cross-border position (APP 8).</strong> This site is
                  deployed on Vercel, a hosting provider incorporated in the United States, and is
                  served from its Sydney region. Like any web host, Vercel may keep its own request
                  logs, including IP addresses, under its own privacy policy and outside this
                  application&rsquo;s control. That is a disclosure to an overseas recipient in the
                  APP 8 sense, it is unavoidable for any hosted website, and it is separate from
                  the analytics described on this page. The analytics database itself is not shared
                  with anyone.
                </p>
                <p>
                  <strong>AI analysis.</strong> The private console can optionally pass aggregated
                  statistics &mdash; counts, rates and page paths &mdash; to a language model to
                  generate commentary. Individual records and identifiers are never included, only
                  totals. This is the one path on which any analytics-derived data leaves the
                  server, which is why it is named here rather than left inside the blanket
                  commitment above. The feature is off unless a provider is explicitly configured,
                  and it is currently not configured.
                </p>
                <p className="privacy__updated">Last updated: 26 September 2026.</p>
              </div>
            </Reveal>
          </section>
        </div>
      </section>
    </>
  );
}
