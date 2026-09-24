import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text } from "../components/Todo.jsx";
import { LabNetwork } from "../components/LabNetwork.jsx";
import { labs, plannedLabs, labCategories } from "../content/labs.js";
import { EASE } from "../lib/motion.js";
import { analytics } from "../lib/analytics.js";

/**
 * Isolation notice.
 *
 * Stated prominently and first. A security portfolio that publishes lab work
 * has an obligation to be explicit that the vulnerable targets are not hosted
 * here — both because it is true and because a reader evaluating judgement will
 * look for exactly this.
 */
function IsolationNotice() {
  return (
    <Reveal className="lab-notice">
      <span className="lab-notice__icon" aria-hidden="true" />
      <div>
        <p className="lab-notice__title">Write-ups only — nothing exploitable is hosted here</p>
        <p className="lab-notice__body">
          Every lab below documents work carried out against a system I own or built deliberately
          for testing. The vulnerable targets themselves run locally or inside isolated
          environments and are never deployed as part of this site. What is published here is the
          method, the finding, the remediation and the reasoning.
        </p>
      </div>
    </Reveal>
  );
}

export default function Lab() {
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleLabs =
    activeCategory === "all" ? labs : labs.filter((lab) => lab.category === activeCategory);

  // Only offer a filter for categories that have at least one completed lab.
  const availableCategories = labCategories.filter((category) =>
    labs.some((lab) => lab.category === category.id)
  );

  return (
    <>
      <Seo
        title="Cyber Lab"
        path="/lab"
        description="Hands-on security write-ups: cookie and session security, Content Security Policy hardening, and authentication defence — findings, remediation and reasoning."
      />

      <div className="lab-hero">
        <LabNetwork />
        <PageHeader
          eyebrow="Cyber Lab"
          title="Security work, written up properly"
          lede="What was tested, what was found, what was fixed, and what it cost. Findings from systems I own."
        />
      </div>

      <section className="section">
        <div className="shell shell--wide">
          <IsolationNotice />

          <Reveal className="lab-filters" delay={0.06}>
            <div className="lab-filters__row" role="group" aria-label="Filter labs by category">
              <button
                type="button"
                className={`lab-filter ${activeCategory === "all" ? "is-active" : ""}`}
                onClick={() => setActiveCategory("all")}
                aria-pressed={activeCategory === "all"}
              >
                All
                <span className="lab-filter__count">{labs.length}</span>
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`lab-filter ${activeCategory === category.id ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(category.id)}
                  aria-pressed={activeCategory === category.id}
                >
                  {category.label}
                  <span className="lab-filter__count">
                    {labs.filter((lab) => lab.category === category.id).length}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          {/* `layout` lets the remaining cards slide into place when the filter
              changes, rather than snapping. */}
          <motion.div layout className="grid grid--wide lab-grid">
            {visibleLabs.map((lab) => (
              <motion.div
                key={lab.slug}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Link
                  to={`/lab/${lab.slug}`}
                  className="card card--interactive lab-entry"
                  onClick={() => analytics.trackEvent("lab_view", { lab: lab.slug, from: "index" })}
                >
                  <div className="lab-entry__head">
                    <span className="tag tag--brand">{lab.categoryLabel}</span>
                    <span className="lab-entry__status">
                      <span className="lab-entry__dot" aria-hidden="true" />
                      {lab.status === "complete" ? "Complete" : lab.status}
                    </span>
                  </div>

                  <h2 className="title-s lab-entry__title">{lab.title}</h2>
                  <p className="muted lab-entry__summary">{lab.summary}</p>

                  <dl className="lab-entry__stats">
                    <div>
                      <dt>Findings</dt>
                      <dd>{lab.findings.length}</dd>
                    </div>
                    <div>
                      <dt>Fixes</dt>
                      <dd>{lab.remediation.length}</dd>
                    </div>
                    <div>
                      <dt>Year</dt>
                      <dd>{lab.date}</dd>
                    </div>
                  </dl>

                  <span className="lab-entry__cta">
                    Read the write-up
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="shell shell--wide">
          <Reveal>
            <p className="eyebrow">Roadmap</p>
            <h2 className="title-l">Planned labs</h2>
            <p className="lede">
              Listed separately and clearly marked, so nothing in progress is mistaken for
              completed work.
            </p>
          </Reveal>

          <RevealGroup className="grid grid--cards planned__grid" gap={0.06}>
            {plannedLabs.map((lab) => (
              <RevealItem key={lab.title} className="planned__item">
                <span className="planned__badge">Planned</span>
                <h3 className="title-s">{lab.title}</h3>
                <p className="muted planned__category">{lab.categoryLabel}</p>
                <p className="planned__note">
                  <Text value={lab.note} />
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
