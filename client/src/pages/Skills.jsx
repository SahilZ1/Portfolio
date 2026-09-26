import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal, RevealGroup, RevealItem } from "../components/Reveal.jsx";
import { Text } from "../components/Todo.jsx";
import { Link } from "react-router-dom";
import { evidencedSkills, skillGroups, certifications } from "../content/profile.js";

/**
 * Skills, split into two clearly distinguished halves.
 *
 * The distinction is the point: "demonstrated in this repository" is a
 * verifiable claim a reader can check against the source, and mixing it with
 * self-reported experience would dilute both. Presenting them separately is
 * more honest and, for a technical reader, more persuasive.
 */
export default function Skills() {
  return (
    <>
      <Seo
        title="Skills"
        path="/skills"
        description="Technical skills across security engineering, backend development, data and privacy engineering — with the subset evidenced by this repository marked as such."
      />
      <PageHeader
        eyebrow="Skills"
        title="What I can do, and how you can check"
        lede="The first group is demonstrable by reading the projects behind it. The second is experience from elsewhere."
      />

      <section className="section">
        <div className="shell shell--wide">
          <Reveal>
            <div className="skills__banner">
              <span className="skills__banner-mark" aria-hidden="true" />
              <p>
                <strong>Evidenced by published work.</strong> Every item below names the project
                that demonstrates it — this site, the network intrusion detection system, the
                Splunk SOC lab or the Sysmon detection write-up. All of them are public.
              </p>
            </div>
          </Reveal>

          <RevealGroup className="grid grid--cards skills__grid" gap={0.07}>
            {evidencedSkills.map((group) => (
              <RevealItem key={group.group} className="card skills__card">
                <h2 className="skills__group">{group.group}</h2>
                <ul className="skills__list">
                  {group.items.map((item) => (
                    <li key={item.name} className="skills__item">
                      <span className="skills__name">{item.name}</span>
                      <span className="skills__evidence">{item.evidence}</span>
                    </li>
                  ))}
                </ul>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section section--tint">
        <div className="shell shell--wide">
          <Reveal>
            <p className="eyebrow">Beyond the published work</p>
            <h2 className="title-l">Wider toolkit</h2>
          </Reveal>

          <RevealGroup className="grid grid--cards skills__grid" gap={0.07}>
            {skillGroups.map((group) => (
              <RevealItem key={group.group} className="card skills__card">
                <h3 className="skills__group">{group.group}</h3>
                <div className="tag-row">
                  {group.items.map((item, index) => (
                    <span key={index} className="tag">
                      <Text value={item} />
                    </span>
                  ))}
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section">
        <div className="shell shell--wide">
          <Reveal>
            <p className="eyebrow">Certified</p>
            <h2 className="title-l">Certifications</h2>
          </Reveal>

          <RevealGroup className="grid grid--cards certs-strip" gap={0.06}>
            {certifications
              .filter((certification) => certification.status === "Held")
              .map((certification) => (
                <RevealItem key={certification.name} className="card certs-strip__item">
                  <span className="certs-strip__badge" aria-hidden="true" />
                  <h3 className="title-s certs-strip__name">{certification.name}</h3>
                  <p className="muted certs-strip__issuer">{certification.issuer}</p>
                </RevealItem>
              ))}
          </RevealGroup>

          <Reveal delay={0.08}>
            <Link to="/certifications" className="btn btn--secondary">
              All certifications
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
