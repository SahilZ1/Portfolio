import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Seo } from "../components/Seo.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { getLab, labs } from "../content/labs.js";
import { analytics } from "../lib/analytics.js";

/**
 * Severity labels.
 *
 * Deliberately not CVSS scores. These findings are design decisions and
 * hardening steps on a system I control, not vulnerabilities in someone else's
 * product, and attaching a numeric severity to them would imply a rigour the
 * assessment does not have. The four labels describe what the finding *is*.
 */
const SEVERITY = {
  design: { label: "Design decision", className: "sev--design" },
  fixed: { label: "Fixed", className: "sev--fixed" },
  accepted: { label: "Risk accepted", className: "sev--accepted" },
  note: { label: "Note", className: "sev--note" },
};

export default function LabDetail() {
  const { slug } = useParams();
  const lab = getLab(slug);

  useEffect(() => {
    if (lab) analytics.trackEvent("lab_view", { lab: lab.slug, depth: "detail" });
  }, [lab]);

  if (!lab) return <Navigate to="/lab" replace />;

  const others = labs.filter((entry) => entry.slug !== lab.slug).slice(0, 2);

  return (
    <>
      <Seo
        title={lab.title}
        path={`/lab/${lab.slug}`}
        description={lab.summary}
        type="article"
      />

      <header className="case__header">
        <div className="shell shell--wide">
          <Reveal>
            <Link to="/lab" className="case__back">
              <span aria-hidden="true">←</span> Cyber Lab
            </Link>
          </Reveal>

          <Reveal delay={0.04}>
            <div className="case__meta">
              <span className="tag tag--brand">{lab.categoryLabel}</span>
              <span className="tag">{lab.date}</span>
            </div>

            <h1 className="title-xl case__name">{lab.title}</h1>
            <p className="lede">{lab.summary}</p>

            <p className="lab-env">
              <span className="lab-env__label">Environment</span>
              <span>{lab.environment}</span>
            </p>
          </Reveal>
        </div>
      </header>

      <div className="shell shell--wide case__body">
        <section className="case__section">
          <Reveal>
            <p className="eyebrow">Objective</p>
            <h2 className="title-l case__title">What I set out to determine</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="prose">{lab.objective}</p>
          </Reveal>
        </section>

        <section className="case__section">
          <Reveal>
            <p className="eyebrow">Method</p>
            <h2 className="title-l case__title">Approach</h2>
          </Reveal>
          <RevealGroup as="ol" className="method" gap={0.05}>
            {lab.approach.map((step, index) => (
              <RevealItem as="li" key={index} className="method__step">
                <span className="method__number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section className="case__section">
          <Reveal>
            <p className="eyebrow">Findings</p>
            <h2 className="title-l case__title">
              {lab.findings.length} findings
            </h2>
          </Reveal>

          <RevealGroup className="findings" gap={0.07}>
            {lab.findings.map((finding, index) => {
              const severity = SEVERITY[finding.severity] ?? SEVERITY.note;
              return (
                <RevealItem key={index} className="finding">
                  <div className="finding__head">
                    <span className={`sev ${severity.className}`}>{severity.label}</span>
                    <h3 className="finding__title">{finding.title}</h3>
                  </div>
                  <p className="finding__detail">{finding.detail}</p>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </section>

        <section className="case__section">
          <Reveal>
            <p className="eyebrow">Remediation</p>
            <h2 className="title-l case__title">What was implemented</h2>
          </Reveal>
          <RevealGroup as="ul" className="case__security" gap={0.04}>
            {lab.remediation.map((item, index) => (
              <RevealItem as="li" key={index}>
                <span className="case__shield" aria-hidden="true" />
                <span>{item}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section className="case__section">
          <Reveal>
            <p className="eyebrow">Lessons</p>
            <h2 className="title-l case__title">What I took away</h2>
          </Reveal>
          <RevealGroup as="ul" className="case__list" gap={0.05}>
            {lab.lessons.map((lesson, index) => (
              <RevealItem as="li" key={index}>{lesson}</RevealItem>
            ))}
          </RevealGroup>
        </section>

        {lab.references?.length > 0 && (
          <section className="case__section">
            <Reveal>
              <p className="eyebrow">References</p>
              <h2 className="title-l case__title">Further reading</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <ul className="references">
                {lab.references.map((reference, index) => (
                  <li key={index}>
                    <span className="references__label">{reference.label}</span>
                    <span className="references__note muted">{reference.note}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        )}
      </div>

      {others.length > 0 && (
        <section className="section section--tint">
          <div className="shell shell--wide">
            <Reveal>
              <p className="eyebrow">Keep reading</p>
              <h2 className="title-l">Other lab write-ups</h2>
            </Reveal>
            <RevealGroup className="grid grid--wide" gap={0.07}>
              {others.map((other) => (
                <RevealItem key={other.slug}>
                  <Link
                    to={`/lab/${other.slug}`}
                    className="card card--interactive lab-entry"
                    onClick={() => analytics.trackEvent("lab_view", { lab: other.slug, from: "related" })}
                  >
                    <span className="tag tag--brand">{other.categoryLabel}</span>
                    <h3 className="title-s lab-entry__title">{other.title}</h3>
                    <p className="muted lab-entry__summary">{other.summary}</p>
                    <span className="lab-entry__cta">
                      Read the write-up <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}
    </>
  );
}
