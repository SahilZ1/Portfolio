import { useState } from "react";
import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text, isReal, Todo } from "../components/Todo.jsx";
import { ExternalLink } from "../components/ExternalLink.jsx";
import { site } from "../content/site.js";
import { analytics } from "../lib/analytics.js";

/**
 * Contact page.
 *
 * Direct channels only — no contact form, deliberately.
 *
 * A form would mean accepting unauthenticated user-supplied text, storing or
 * relaying it, and defending a new endpoint against spam and abuse, all to
 * deliver a message that an email link delivers already. The correct security
 * decision for a personal site is to not build the attack surface. That
 * reasoning is stated on the page rather than left implicit, because on a
 * security portfolio the absence of a feature is worth explaining.
 */

function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      analytics.trackEvent("copy_email");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied or unavailable over plain HTTP. The
      // mailto link beside this button is the fallback, so failing quietly is
      // acceptable here.
    }
  };

  return (
    <button type="button" className="btn btn--secondary btn--small" onClick={copy}>
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}

export default function Contact() {
  const { email, linkedin, github, resume } = site.links;

  return (
    <>
      <Seo
        title="Contact"
        path="/contact"
        description={`Get in touch with ${site.name} about security engineering roles and work.`}
      />
      <PageHeader
        eyebrow="Contact"
        title="Let's talk"
        lede={
          <Text
            value={site.availability}
            fallback="Open to conversations about security engineering work."
          />
        }
      />

      <section className="section">
        <div className="shell shell--wide">
          <RevealGroup className="grid grid--cards contact__grid" gap={0.07}>
            <RevealItem className="card contact__card">
              <span className="contact__label">Email</span>
              {isReal(email) ? (
                <>
                  <a
                    href={`mailto:${email}`}
                    className="contact__value"
                    onClick={() => analytics.trackEvent("contact_click", { channel: "email" })}
                  >
                    {email}
                  </a>
                  <div className="contact__actions">
                    <a
                      href={`mailto:${email}`}
                      className="btn btn--small"
                      onClick={() => analytics.trackEvent("contact_click", { channel: "email" })}
                    >
                      Send an email
                      <span className="btn__arrow" aria-hidden="true">→</span>
                    </a>
                    <CopyEmail email={email} />
                  </div>
                </>
              ) : (
                <Todo hint={email.hint} />
              )}
            </RevealItem>

            <RevealItem className="card contact__card">
              <span className="contact__label">LinkedIn</span>
              {isReal(linkedin) ? (
                <>
                  <span className="contact__value">Professional profile</span>
                  <div className="contact__actions">
                    <ExternalLink
                      href={linkedin}
                      className="btn btn--small"
                      context={{ channel: "linkedin" }}
                    >
                      Open LinkedIn
                      <span className="btn__arrow" aria-hidden="true">→</span>
                    </ExternalLink>
                  </div>
                </>
              ) : (
                <Todo hint={linkedin.hint} />
              )}
            </RevealItem>

            <RevealItem className="card contact__card">
              <span className="contact__label">GitHub</span>
              {isReal(github) ? (
                <>
                  <span className="contact__value">Source and projects</span>
                  <div className="contact__actions">
                    <ExternalLink
                      href={github}
                      className="btn btn--small"
                      context={{ channel: "github" }}
                    >
                      Open GitHub
                      <span className="btn__arrow" aria-hidden="true">→</span>
                    </ExternalLink>
                  </div>
                </>
              ) : (
                <Todo hint={github.hint} />
              )}
            </RevealItem>

            <RevealItem className="card contact__card">
              <span className="contact__label">Résumé</span>
              {isReal(resume) ? (
                <>
                  <span className="contact__value">Download a copy</span>
                  <div className="contact__actions">
                    <a
                      href={resume}
                      className="btn btn--small"
                      download
                      onClick={() => analytics.trackEvent("resume_download")}
                    >
                      Download résumé
                      <span className="btn__arrow" aria-hidden="true">↓</span>
                    </a>
                  </div>
                </>
              ) : (
                <Todo hint={resume.hint} />
              )}
            </RevealItem>
          </RevealGroup>

          <Reveal delay={0.1}>
            <aside className="contact__note">
              <h2 className="title-s">Why there is no contact form</h2>
              <p className="muted">
                A form means accepting unauthenticated text from anyone, storing or relaying it,
                and then defending that endpoint against spam and abuse — all to deliver a message
                an email link already delivers. On a personal site the right security decision is
                not to build the attack surface in the first place.
              </p>
            </aside>
          </Reveal>
        </div>
      </section>
    </>
  );
}
