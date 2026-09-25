import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text, isReal } from "../components/Todo.jsx";
import { ExternalLink } from "../components/ExternalLink.jsx";
import { certifications } from "../content/profile.js";

export default function Certifications() {
  return (
    <>
      <Seo
        title="Certifications"
        path="/certifications"
        description="Professional security certifications held and in progress."
      />
      <PageHeader
        eyebrow="Certifications"
        title="Credentials"
        lede="Held and in progress, with verification links where available."
      />

      <section className="section">
        <div className="shell shell--wide">
          <RevealGroup className="grid grid--cards" gap={0.07}>
            {certifications.map((certification, index) => (
              <RevealItem key={index} className="card cert-card">
                <div className="cert-card__badge" aria-hidden="true" />
                <h2 className="title-s">
                  <Text value={certification.name} />
                </h2>
                <p className="muted">
                  <Text value={certification.issuer} />
                </p>

                <dl className="cert-card__meta">
                  {certification.date && (
                    <div>
                      <dt>Issued</dt>
                      <dd>
                        <Text value={certification.date} />
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <Text value={certification.status} />
                    </dd>
                  </div>
                  {certification.credentialId && (
                    <div>
                      <dt>Credential ID</dt>
                      <dd className="mono">
                        <Text value={certification.credentialId} />
                      </dd>
                    </div>
                  )}
                </dl>

                {isReal(certification.url) && (
                  <ExternalLink href={certification.url} className="cert-card__verify">
                    Verify <span aria-hidden="true">→</span>
                  </ExternalLink>
                )}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
