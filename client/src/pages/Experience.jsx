import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal } from "../components/Reveal.jsx";
import { Text, TextList } from "../components/Todo.jsx";
import { experience } from "../content/profile.js";

/**
 * Experience timeline.
 *
 * The vertical rule and its yellow markers are drawn with a border and
 * absolutely positioned dots rather than an SVG path, so the timeline reflows
 * correctly at any content length and needs no measurement.
 */
export default function Experience() {
  return (
    <>
      <Seo
        title="Experience"
        path="/experience"
        description="Professional experience in cybersecurity, cloud and security engineering."
      />
      <PageHeader
        eyebrow="Experience"
        title="Where I've worked"
        lede="Roles, remits and the things I actually shipped."
      />

      <section className="section">
        <div className="shell shell--wide">
          <ol className="timeline">
            {experience.map((role, index) => (
              <Reveal as="li" key={index} delay={index * 0.05} className="timeline__item">
                <span className="timeline__marker" aria-hidden="true" />

                <div className="timeline__meta">
                  <p className="timeline__period"><Text value={role.period} /></p>
                  <p className="timeline__location muted"><Text value={role.location} /></p>
                </div>

                <div className="timeline__body">
                  <h2 className="title-m timeline__role"><Text value={role.role} /></h2>
                  <p className="timeline__org brand-text"><Text value={role.organisation} /></p>
                  <p className="timeline__summary muted"><Text value={role.summary} /></p>

                  <TextList items={role.highlights} className="timeline__highlights" />

                  {role.stack?.length > 0 && (
                    <div className="tag-row timeline__stack">
                      {role.stack.map((item, itemIndex) => (
                        <span key={itemIndex} className="tag">
                          <Text value={item} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
