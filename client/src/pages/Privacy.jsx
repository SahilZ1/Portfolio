import { Seo } from "../components/Seo.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Reveal } from "../components/Reveal.jsx";

/**
 * Privacy page.
 *
 * The portfolio contains a custom first-party analytics implementation as a
 * technical project, but live analytics collection is disabled.
 */

export default function Privacy() {
  return (
    <>
      <Seo
        title="Privacy"
        description="Privacy information for this portfolio."
        path="/privacy"
      />

      <PageHeader
        eyebrow="Privacy"
        title="Privacy & analytics"
        lede="Information about analytics and data collection on this portfolio."
      />

      <section className="section">
        <div className="container privacy">
          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Analytics collection is disabled</h2>

              <div className="prose">
                <p>
                  This portfolio contains a custom first-party analytics system
                  that I developed as part of the project. The system was
                  designed to record information such as page views, sessions,
                  traffic sources, device categories and interactions and
                  display aggregated information through a private analytics
                  dashboard.
                </p>

                <p>
                  <strong>
                    Live collection through this custom analytics system has
                    been disabled.
                  </strong>{" "}
                  The portfolio no longer issues its analytics visitor cookie
                  to new visitors and no longer records new page views, events
                  or visitor sessions through the custom analytics system.
                </p>

                <p>
                  The underlying analytics implementation remains in the
                  project source code as a demonstration of full-stack
                  development, database design, session handling, privacy
                  considerations and secure application development.
                </p>
              </div>
            </Reveal>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Cookies</h2>

              <div className="prose">
                <p>
                  The custom analytics system previously used a first-party
                  visitor cookie to distinguish repeat visits. Issuing and
                  using that analytics cookie has been disabled on the public
                  portfolio.
                </p>

                <p>
                  The analytics implementation remains available in the
                  project for demonstration purposes, but it is not being used
                  to track visitors on the live site.
                </p>
              </div>
            </Reveal>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Third-party infrastructure</h2>

              <div className="prose">
                <p>
                  Like most hosted websites, infrastructure providers used to
                  deliver this site may process technical request information
                  independently as part of providing their services. Their
                  processing is separate from the custom analytics system
                  described above.
                </p>
              </div>
            </Reveal>
          </section>

          <section className="privacy__section">
            <Reveal>
              <h2 className="title-l">Project status</h2>

              <div className="prose">
                <p>
                  The analytics functionality is retained as a portfolio
                  project so its architecture, security controls and
                  implementation can be demonstrated without requiring ongoing
                  collection of visitor analytics.
                </p>

                <p className="privacy__updated">
                  Last updated: 30 September 2026.
                </p>
              </div>
            </Reveal>
          </section>
        </div>
      </section>
    </>
  );
}