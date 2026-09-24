import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal } from "../components/Reveal.jsx";
import { Text } from "../components/Todo.jsx";
import { education } from "../content/profile.js";

export default function Education() {
  return (
    <>
      <Seo
        title="Education"
        path="/education"
        description="Academic background in cybersecurity and computing."
      />
      <PageHeader eyebrow="Education" title="Academic background" />

      <section className="section">
        <div className="shell shell--wide">
          <ol className="timeline">
            {education.map((entry, index) => (
              <Reveal as="li" key={index} delay={index * 0.05} className="timeline__item">
                <span className="timeline__marker" aria-hidden="true" />

                <div className="timeline__meta">
                  <p className="timeline__period">
                    <Text value={entry.period} />
                  </p>
                  <p className="timeline__location muted">
                    <Text value={entry.location} />
                  </p>
                </div>

                <div className="timeline__body">
                  <h2 className="title-m">
                    <Text value={entry.qualification} />
                  </h2>
                  <p className="timeline__org brand-text">
                    <Text value={entry.institution} />
                  </p>
                  <p className="timeline__summary muted">
                    <Text value={entry.detail} />
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
