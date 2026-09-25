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

function Section({ id, number, eyebrow, title, children }) {
  return (
    <section className="case__section" id={id}>
      <Reveal>
        <p className="eyebrow">
          {String(number).padStart(2, "0")} — {eyebrow}
        </p>
        <h2 className="title-l case__title">{title}</h2>
      </Reveal>
      <Reveal delay={0.05}>{children}</Reveal>
    </section>
  );
}

/** True when a section has something worth rendering. */
const present = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export default function ProjectDetail() {
  const { slug } = useParams();
  const project = getProject(slug);

  // Record the detail view with the project slug attached, so the dashboard can
  // rank individual case studies rather than just the /projects prefix.
  useEffect(() => {
    if (project) analytics.trackEvent("project_view", { project: project.slug, depth: "detail" });
  }, [project]);

  if (!project) return <Navigate to="/projects" replace />;

  const sections = project.sections ?? {};

  /*
   * Sections are assembled and then filtered, rather than each being rendered
   * with its own guard, so the numbering stays contiguous. A project that has
   * no security section should not leave a gap where "07" used to be — and,
   * more importantly, a missing section must never be a reason to invent
   * content to fill the heading.
   */
  const blocks = [
    {
      id: "overview",
      eyebrow: "Overview",
      title: "What it is",
      show: present(sections.overview),
      render: () => <Body value={sections.overview} />,
    },
    {
      id: "problem",
      eyebrow: "Problem",
      title: "Why it needed building",
      show: present(sections.problem),
      render: () => <Body value={sections.problem} />,
    },
    {
      id: "solution",
      eyebrow: "Solution",
      title: "The approach",
      show: present(sections.solution),
      render: () => <Body value={sections.solution} />,
    },
    {
      id: "architecture",
      eyebrow: "Architecture",
      title: "How it fits together",
      show: present(sections.architecture?.description) || present(sections.architecture?.flow),
      render: () => (
        <>
          <Body value={sections.architecture?.description} />
          <ArchitectureFlow steps={sections.architecture?.flow} />
        </>
      ),
    },
    {
      id: "capabilities",
      eyebrow: "Capabilities",
      title: "What it does",
      show: present(sections.capabilities?.description) || present(sections.capabilities?.items),
      render: () => (
        <>
          <Body value={sections.capabilities?.description} />
          <TextList items={sections.capabilities?.items} className="case__list" />
        </>
      ),
    },
    {
      id: "technology",
      eyebrow: "Technology",
      title: "Stack",
      show: present(sections.technology),
      render: () => (
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
      ),
    },
    {
      id: "security",
      eyebrow: "Security",
      title: "Security decisions",
      show: present(sections.security?.description) || present(sections.security?.items),
      render: () => (
        <>
          <Body value={sections.security?.description} />
          {present(sections.security?.items) && (
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
          )}
        </>
      ),
    },
    {
      id: "screenshots",
      eyebrow: "Screenshots",
      title: "What it looks like",
      show: project.screenshots?.length > 0,
      render: () => (
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
      ),
    },
    {
      id: "challenges",
      eyebrow: "Challenges",
      title: "What was hard",
      show: present(sections.challenges),
      render: () => <TextList items={sections.challenges} className="case__list" />,
    },
    {
      id: "results",
      eyebrow: "Results",
      title: "Outcome",
      show: present(sections.results),
      render: () => <Body value={sections.results} />,
    },
    {
      id: "lessons",
      eyebrow: "Lessons",
      title: "What I took away",
      show: present(sections.lessons),
      render: () => <TextList items={sections.lessons} className="case__list" />,
    },
  ].filter((block) => block.show);

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
              {project.draft && !isReal(project.links?.github) && !isReal(project.links?.demo) && (
                <Todo hint="Add GitHub / demo URLs in content/projects.js" />
              )}
            </div>
          </Reveal>
        </div>
      </header>

      <div className="shell shell--wide case__body">
        {blocks.map((block, index) => (
          <Section
            key={block.id}
            id={block.id}
            number={index + 1}
            eyebrow={block.eyebrow}
            title={block.title}
          >
            {block.render()}
          </Section>
        ))}
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
