/**
 * Home page.
 *
 * The hero is the one place on the site where motion is allowed to be the
 * point. Everything below it earns its animation by revealing content.
 *
 * The name entrance uses a per-line clip-path mask rather than a per-character
 * animation: masked lines read as typographic and deliberate, where per-letter
 * staggers on a large display face read as a gimmick. It is also two animated
 * elements instead of eleven.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo, PersonSchema } from "../components/Seo.jsx";
import { HeroBackground } from "../components/HeroBackground.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text, isReal } from "../components/Todo.jsx";
import { ExternalLink } from "../components/ExternalLink.jsx";
import { site } from "../content/site.js";
import { projects } from "../content/projects.js";
import { labs } from "../content/labs.js";
import { evidencedSkills } from "../content/profile.js";
import { EASE, prefersReducedMotion } from "../lib/motion.js";
import { analytics } from "../lib/analytics.js";

/** One line of the display name, revealed from behind a mask. */
function NameLine({ children, delay }) {
  const reduced = prefersReducedMotion();

  return (
    <span className="hero__line">
      <motion.span
        className="hero__line-inner"
        initial={reduced ? { opacity: 0 } : { y: "108%" }}
        animate={reduced ? { opacity: 1 } : { y: "0%" }}
        transition={{ duration: reduced ? 0.001 : 0.95, ease: EASE, delay: reduced ? 0 : delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Hero() {
  const reduced = prefersReducedMotion();
  const base = reduced ? 0 : 0.1;

  return (
    <section className="hero">
      <HeroBackground />

      <div className="hero__inner shell shell--wide">
        <motion.p
          className="hero__eyebrow eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: base }}
        >
          Portfolio
        </motion.p>

        <h1 className="hero__name display">
          <NameLine delay={base + 0.1}>{site.firstName}</NameLine>
          <NameLine delay={base + 0.2}>{site.lastName}</NameLine>
        </h1>

        {/* Disciplines, revealed one at a time with yellow separators. */}
        <motion.p
          className="hero__disciplines"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.11, delayChildren: base + 0.6 } },
          }}
        >
          {site.disciplines.map((discipline, index) => (
            <motion.span
              key={discipline}
              className="hero__discipline"
              variants={{
                hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
              }}
            >
              {index > 0 && <span className="hero__dot" aria-hidden="true" />}
              {discipline}
            </motion.span>
          ))}
        </motion.p>

        <motion.p
          className="hero__statement"
          initial={{ opacity: 0, y: reduced ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: base + 0.95 }}
        >
          <span className="mark">{site.statement}</span>
        </motion.p>

        <motion.p
          className="hero__intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: base + 1.1 }}
        >
          {site.intro}
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: base + 1.25 }}
        >
          <Link
            to="/projects"
            className="btn"
            onClick={() => analytics.trackEvent("cta_click", { cta: "projects", from: "hero" })}
          >
            See the work
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
          <Link
            to="/lab"
            className="btn btn--secondary"
            onClick={() => analytics.trackEvent("cta_click", { cta: "lab", from: "hero" })}
          >
            Enter the Cyber Lab
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="hero__scroll"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: base + 1.6 }}
      >
        <span className="hero__scroll-line" />
        <span className="hero__scroll-label">Scroll</span>
      </motion.div>
    </section>
  );
}

/**
 * "What this site is" strip.
 *
 * Deliberately concrete and verifiable. A recruiter scanning for thirty seconds
 * should learn that the site itself is the artefact.
 */
function Proof() {
  const points = [
    {
      title: "Built, not installed",
      body: "Express and PostgreSQL backend, React frontend, custom SQL migrations. No site builder, no template.",
    },
    {
      title: "Instrumented by hand",
      body: "First-party analytics: visitors, sessions, page views, events and journey reconstruction — no Google Analytics.",
    },
    {
      title: "Hardened deliberately",
      body: "Strict CSP, parameterised SQL, bcrypt, session regeneration, rate limiting. Every decision documented.",
    },
    {
      title: "Private by design",
      body: "No fingerprinting, no raw IP storage, User-Agent discarded after classification, retention actually enforced.",
    },
  ];

  return (
    <section className="section section--tint">
      <div className="shell shell--wide">
        <Reveal>
          <p className="eyebrow">This site is the portfolio piece</p>
        </Reveal>

        <RevealGroup className="grid grid--cards proof__grid" gap={0.08}>
          {points.map((point) => (
            <RevealItem key={point.title} className="proof__item">
              <h3 className="title-s">{point.title}</h3>
              <p className="muted">{point.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/**
 * Featured project cards.
 *
 * Drafts are excluded and the list is capped: the home page is a trailer, not
 * the index. A case study still marked "in progress" has nothing to show a
 * visitor who is thirty seconds in, and belongs on /projects where the label
 * explaining it is visible.
 */
function FeaturedWork() {
  const featured = projects.filter((project) => !project.draft).slice(0, 3);

  return (
    <section className="section">
      <div className="shell shell--wide">
        <Reveal className="section__head">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 className="title-xl">Projects built end to end</h2>
          </div>
          <Link to="/projects" className="section__more">
            All projects <span aria-hidden="true">→</span>
          </Link>
        </Reveal>

        <RevealGroup className="grid grid--wide" gap={0.1}>
          {featured.map((project) => (
            <RevealItem key={project.slug}>
              <Link
                to={`/projects/${project.slug}`}
                className="card card--interactive project-card"
                onClick={() => analytics.trackEvent("project_view", { project: project.slug, from: "home" })}
              >
                <div className="project-card__head">
                  <span className="tag tag--brand">{project.category}</span>
                  {project.draft && <span className="tag">Case study in progress</span>}
                </div>
                <h3 className="title-m project-card__title">{project.name}</h3>
                <p className="project-card__summary muted">
                  <Text value={project.summary} />
                </p>
                <div className="project-card__foot">
                  <span className="project-card__cta">
                    Read the case study
                    <span className="project-card__arrow" aria-hidden="true">→</span>
                  </span>
                </div>
                <span className="project-card__edge" aria-hidden="true" />
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/** Cyber Lab teaser. */
function LabTeaser() {
  return (
    <section className="section section--lab">
      <div className="shell shell--wide">
        <Reveal className="section__head">
          <div>
            <p className="eyebrow">Cyber Lab</p>
            <h2 className="title-xl">Findings from systems I own</h2>
            <p className="lede">
              Write-ups of security work carried out against systems I built or control. The
              deliberately vulnerable targets stay isolated and local — what is published here is
              the finding, the fix and the reasoning.
            </p>
          </div>
        </Reveal>

        <RevealGroup className="grid grid--cards lab-teaser__grid" gap={0.08}>
          {labs.map((lab) => (
            <RevealItem key={lab.slug}>
              <Link
                to={`/lab/${lab.slug}`}
                className="card card--interactive lab-card"
                onClick={() => analytics.trackEvent("lab_view", { lab: lab.slug, from: "home" })}
              >
                <span className="lab-card__category">{lab.categoryLabel}</span>
                <h3 className="title-s lab-card__title">{lab.title}</h3>
                <p className="muted lab-card__summary">{lab.summary}</p>
                <span className="lab-card__findings">
                  {lab.findings.length} findings
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1}>
          <Link to="/lab" className="btn btn--secondary">
            All lab write-ups
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/** Capability summary, drawn from what the repository demonstrably shows. */
function Capabilities() {
  return (
    <section className="section section--tint">
      <div className="shell shell--wide">
        <Reveal>
          <p className="eyebrow">Demonstrated in this repository</p>
          <h2 className="title-xl">What the code shows</h2>
        </Reveal>

        <RevealGroup className="grid grid--cards capabilities__grid" gap={0.07}>
          {evidencedSkills.map((group) => (
            <RevealItem key={group.group} className="capabilities__group">
              <h3 className="capabilities__heading">{group.group}</h3>
              <ul className="capabilities__list">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <span className="capabilities__name">{item.name}</span>
                    <span className="capabilities__evidence">{item.evidence}</span>
                  </li>
                ))}
              </ul>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.08}>
          <Link to="/skills" className="btn btn--secondary">
            Full skills breakdown
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/** Closing call to action. */
function Contact() {
  return (
    <section className="section cta">
      <div className="shell">
        <Reveal className="cta__inner">
          <p className="eyebrow">Get in touch</p>
          <h2 className="title-xl">
            Looking for someone who can build it <em>and</em> secure it?
          </h2>
          <p className="lede">
            <Text
              value={site.availability}
              fallback="I am interested in security engineering work where the building and the securing are the same job."
            />
          </p>
          <div className="cta__actions">
            <Link
              to="/contact"
              className="btn"
              onClick={() => analytics.trackEvent("cta_click", { cta: "contact", from: "home" })}
            >
              Contact me
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
            {isReal(site.links.github) && (
              <ExternalLink
                href={site.links.github}
                className="btn btn--secondary"
                context={{ from: "home" }}
              >
                View GitHub
              </ExternalLink>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Seo path="/" />
      <PersonSchema />
      <Hero />
      <Proof />
      <FeaturedWork />
      <LabTeaser />
      <Capabilities />
      <Contact />
    </>
  );
}
