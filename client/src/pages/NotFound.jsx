import { Link } from "react-router-dom";
import { Seo } from "../components/Seo.jsx";
import { Reveal } from "../components/Reveal.jsx";

export default function NotFound() {
  return (
    <>
      {/* noIndex: a 404 rendered by the SPA still returns HTTP 200 from the
          static fallback, so the meta tag is what keeps it out of the index. */}
      <Seo title="Page not found" path="/404" noIndex />

      <section className="section notfound">
        <div className="shell">
          <Reveal className="notfound__inner">
            <p className="eyebrow">404</p>
            <h1 className="title-xl">That page does not exist</h1>
            <p className="lede">
              The link may be out of date, or the address may have a typo in it.
            </p>
            <div className="cta__actions">
              <Link to="/" className="btn">
                Back to home
                <span className="btn__arrow" aria-hidden="true">→</span>
              </Link>
              <Link to="/projects" className="btn btn--secondary">
                See the projects
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
