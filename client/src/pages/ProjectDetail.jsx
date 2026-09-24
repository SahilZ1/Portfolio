import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Seo } from "../components/Seo.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text, TextList, isReal, Todo } from "../components/Todo.jsx";
import { ExternalLink } from "../components/ExternalLink.jsx";
import { ArchitectureFlow } from "../components/ArchitectureFlow.jsx";
import { getProject } from "../content/projects.js";
import { isTodo } from "../content/site.js";
import { analytics } from "../lib/analytics.js";

/** Renders a body value that may be multi-paragraph text or a placeholder. */
function Body({ value }) {
  if (isTodo(value)) return <Todo hint={value.hint} />;
  if (!value) return null;
  return (
    <div className="prose">
      {String(value)
        .split("\n\n")
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
    </div>
  );
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section className="case__section" id={id}>
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="title-l case__title">{title}</h2>
      </Reveal>
      <Reveal delay={0.05}>{children}</Reveal>
    </section>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const project = getProject(slug);

  // Record the detail view with the project slug attached, so the dashboard can
  // rank individual case studies rather than just the /projects prefix.
  useEffect(() => {
    if (project) analytics.trackEvent("project_view", { project: project.slug, depth: "detail" });
  }, [project]);

  if (!project) return <Navigate to="/projects" replace />;

  const { sections } = project;

  return (
    <>
      <Seo
        title={project.name}
        path={`/projects/${project.slug}`}
        description={isTodo(project.summary) ? undefined : project.summary}
        type="article"
      />

      <header className="case__header">
        <div className="shell shell--wide">
          <Reveal>
            <Link to="/projects" className="case__back">
              <span aria-hidden="true">←</span> All projects
            </Link>
          </Reveal>

          <Reveal delay={0.04}>
            <div className="case__meta">
              <span className="tag tag--brand">{project.category}</span>
              <span className="tag">
                <Text value={project.status} />
              </span>
              <span className="tag">
                <Text value={project.year} />
              </span>
            </div>

            <h1 className="title-xl case__name">{project.name}</h1>
            <p className="lede">
              <Text value={project.tagline} />
            </p>

            {project.draft && (
              <p className="case__draft" role="note">
                <strong>Case study in progress.</strong> The structure below is ready; the content
                marked TODO is still to be written. Nothing has been filled in with invented detail.
              </p>
            )}

            <div className="case__links">
              {isReal(project.links?.github) && (
                <ExternalLink
                  href={project.links.github}
                  className="btn btn--secondary btn--small"
                  context={{ project: project.slug }}
                >
                  Source on GitHub
                </ExternalLink>
              )}
              {isReal(project.links?.demo) && (
                <ExternalLink
                  href={project.links.demo}
                  className="btn btn--small"
                  context={{ project: project.slug }}
                >
                  Live demo <span className="btn__arrow" aria-hidden="true">→</span>
                </ExternalLink>
              )}
              {!isReal(project.links?.github) && !isReal(project.links?.demo) && (
                <Todo hint="Add GitHub / demo URLs in content/projects.js" />
              )}
            </div>
          </Reveal>
        </div>
      </header>

      <div className="shell shell--wide case__body">
        <Section id="overview" eyebrow="01 — Overview" title="What it is">
          <Body value={sections.overview} />
        </Section>

        <Section id="problem" eyebrow="02 — Problem" title="Why it needed building">
          <Body value={sections.problem} />
        </Section>

        <Section id="solution" eyebrow="03 — Solution" title="The approach">
          <Body value={sections.solution} />
        </Section>

        <Section id="architecture" eyebrow="04 — Architecture" title="How it fits together">
          <Body value={sections.architecture.description} />
          <ArchitectureFlow steps={sections.architecture.flow} />
        </Section>

        <Section id="capabilities" eyebrow="05 — Capabilities" title="What it does">
          <Body value={sections.capabilities.description} />
          <TextList items={sections.capabilities.items} className="case__list" />
        </Section>

        <Section id="technology" eyebrow="06 — Technology" title="Stack">
          <RevealGroup className="case__tech" gap={0.05}>
            {sections.technology.map((row) => (
              <RevealItem key={row.area} className="case__tech-row">
                <span className="case__tech-area">{row.area}</span>
                <span className="case__tech-value">
                  <Text value={row.value} />
                </span>
              </RevealItem>
            ))}
          </RevealGroup>
        </Section>

        <Section id="security" eyebrow="07 — Security" title="Security decisions">
          <Body value={sections.security.description} />
          <ul className="case__security">
            {sections.security.items.map((item, index) => (
              <li key={index}>
                <span className="case__shield" aria-hidden="true" />
                <span>
                  <Text value={item} />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="screenshots" eyebrow="08 — Screenshots" title="What it looks like">
          {project.screenshots.length > 0 ? (
            <div className="grid grid--wide case__shots">
              {project.screenshots.map((shot) => (
                <figure key={shot.src} className="case__shot">
                  {/* loading="lazy" keeps below-the-fold images out of the
                      initial load; explicit dimensions would be better still
                      once real assets exist, to reserve layout space. */}
                  <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
                  {shot.caption && <figcaption>{shot.caption}</figcaption>}
                </figure>
              ))}
            </div>
          ) : (
            <Todo hint="Add screenshots to client/public/projects/ and reference them in content/projects.js" />
          )}
        </Section>

        <Section id="challenges" eyebrow="09 — Challenges" title="What was hard">
          <TextList items={sections.challenges} className="case__list" />
        </Section>

        <Section id="results" eyebrow="10 — Results" title="Outcome">
          <Body value={sections.results} />
        </Section>

        <Section id="lessons" eyebrow="11 — Lessons" title="What I took away">
          <TextList items={sections.lessons} className="case__list" />
        </Section>
      </div>

      <section className="section cta">
        <div className="shell">
          <Reveal className="cta__inner">
            <h2 className="title-l">Want the detail behind any of this?</h2>
            <div className="cta__actions">
              <Link to="/contact" className="btn">
                Get in touch <span className="btn__arrow" aria-hidden="true">→</span>
              </Link>
              <Link to="/projects" className="btn btn--secondary">
                Other projects
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
