import { Link } from "react-router-dom";
import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text } from "../components/Todo.jsx";
import { projects } from "../content/projects.js";
import { analytics } from "../lib/analytics.js";

export default function Projects() {
  return (
    <>
      <Seo
        title="Projects"
        path="/projects"
        description="Security and full-stack engineering projects, each written up as a full case study: problem, architecture, security decisions and outcomes."
      />
      <PageHeader
        eyebrow="Projects"
        title="Case studies, not thumbnails"
        lede="Each project is written up properly — the problem, how it is built, the security decisions taken and what they cost."
      />

      <section className="section">
        <div className="shell shell--wide">
          <RevealGroup className="project-list" gap={0.09}>
            {projects.map((project, index) => (
              <RevealItem key={project.slug}>
                <Link
                  to={`/projects/${project.slug}`}
                  className="project-row"
                  onClick={() =>
                    analytics.trackEvent("project_view", { project: project.slug, from: "index" })
                  }
                >
                  <span className="project-row__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="project-row__main">
                    <span className="project-row__head">
                      <h2 className="title-l project-row__name">{project.name}</h2>
                      {project.draft && <span className="tag">Case study in progress</span>}
                    </span>
                    <span className="project-row__tagline muted">
                      <Text value={project.tagline} />
                    </span>
                    <span className="project-row__summary">
                      <Text value={project.summary} />
                    </span>
                    <span className="tag-row project-row__tags">
                      {project.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="tag">
                          <Text value={tag} />
                        </span>
                      ))}
                    </span>
                  </span>

                  <span className="project-row__go" aria-hidden="true">→</span>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
