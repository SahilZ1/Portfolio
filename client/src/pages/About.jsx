import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text } from "../components/Todo.jsx";
import { about } from "../content/profile.js";
import { site } from "../content/site.js";

export default function About() {
  return (
    <>
      <Seo
        title="About"
        path="/about"
        description={`About ${site.name} — background, focus and engineering principles in cybersecurity and security engineering.`}
      />
      <PageHeader eyebrow="About" title={`Hello — I'm ${site.firstName}.`} lede={site.statement} />

      <section className="section">
        <div className="shell shell--wide about__layout">
          <Reveal className="prose about__bio">
            {about.bio.map((paragraph, index) => (
              <p key={index}>
                <Text value={paragraph} />
              </p>
            ))}
          </Reveal>

          <Reveal delay={0.08} className="about__facts">
            <h2 className="about__facts-title">At a glance</h2>
            <dl>
              {about.facts.map((fact) => (
                <div key={fact.label} className="about__fact">
                  <dt>{fact.label}</dt>
                  <dd><Text value={fact.value} /></dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="section section--tint">
        <div className="shell shell--wide">
          <Reveal>
            <p className="eyebrow">How I work</p>
            <h2 className="title-l">Principles</h2>
          </Reveal>

          <RevealGroup className="grid grid--cards principles__grid" gap={0.08}>
            {about.principles.map((principle, index) => (
              <RevealItem key={index} className="card principles__card">
                <span className="principles__number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p><Text value={principle} /></p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
