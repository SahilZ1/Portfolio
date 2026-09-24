/**
 * Site footer.
 *
 * Carries the analytics disclosure link. Making the privacy page reachable from
 * every page, in plain language, is the honest alternative to a consent banner
 * that nobody reads.
 */

import { Link } from "react-router-dom";
import { site, navigation, footerNavigation } from "../content/site.js";
import { isReal } from "./Todo.jsx";
import { ExternalLink } from "./ExternalLink.jsx";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="shell shell--wide">
        <div className="footer__top">
          <div className="footer__brand">
            <span className="footer__mark" aria-hidden="true" />
            <p className="footer__name">{site.name}</p>
            <p className="footer__statement">{site.statement}</p>
          </div>

          <nav className="footer__nav" aria-label="Footer">
            <div>
              <p className="footer__heading">Explore</p>
              <ul>
                {navigation.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="footer__heading">More</p>
              <ul>
                {footerNavigation.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="footer__heading">Elsewhere</p>
              <ul>
                {isReal(site.links.github) && (
                  <li><ExternalLink href={site.links.github}>GitHub</ExternalLink></li>
                )}
                {isReal(site.links.linkedin) && (
                  <li><ExternalLink href={site.links.linkedin}>LinkedIn</ExternalLink></li>
                )}
                {isReal(site.links.email) && (
                  <li><a href={`mailto:${site.links.email}`}>Email</a></li>
                )}
                {!isReal(site.links.github) && !isReal(site.links.linkedin) && (
                  <li className="footer__todo">Add your links in content/site.js</li>
                )}
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">© {year} {site.name}</p>
          <p className="footer__note">
            This site runs its own first-party analytics.{" "}
            <Link to="/privacy" className="footer__link">See exactly what is collected</Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
