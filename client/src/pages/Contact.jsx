import { useState } from "react";
import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text, isReal, Todo } from "../components/Todo.jsx";
import { ExternalLink } from "../components/ExternalLink.jsx";
import { site } from "../content/site.js";
import { analytics } from "../lib/analytics.js";

/**
 * Contact page.
 *
 * Direct channels only, and no contact form on purpose. A form means accepting
 * unauthenticated text from anyone, storing or relaying it, and then defending
 * that endpoint against spam and abuse, all to deliver a message an email link
 * already delivers. For a personal site the right call is not to build the
 * attack surface in the first place.
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
  const { email, linkedin, github } = site.links;

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
                  <span className="contact__label contact__label--sub">Phone</span>
                  <a
                    href={`tel:${site.phone.replace(/\s+/g, "")}`}
                    className="contact__value"
                    onClick={() => analytics.trackEvent("contact_click", { channel: "phone" })}
                  >
                    {site.phone}
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

          </RevealGroup>
        </div>
      </section>
    </>
  );
}
