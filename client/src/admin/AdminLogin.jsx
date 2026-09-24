/**
 * Administrator sign-in.
 *
 * Styled to match the public site — light, yellow and white — rather than the
 * dark console behind it. The shift to the dark console happens after
 * authentication, which makes the transition itself signal "you are now
 * somewhere private".
 *
 * Security behaviour visible here:
 *  - One error message for every failure. The server refuses to distinguish
 *    a wrong password from an unknown user, and the UI does not invent a
 *    distinction either.
 *  - No "forgot password" flow: there is exactly one account and its password
 *    is reset from the server's shell. A reset-by-email flow would be a new
 *    account-takeover path built to solve a problem that does not exist here.
 *  - The form does not disable autocomplete on the password field. Blocking
 *    password managers pushes people towards weaker, memorable passwords.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, ApiError } from "../lib/api.js";
import { EASE } from "../lib/motion.js";
import { site } from "../content/site.js";

export function AdminLogin({ onAuthenticated, setupRequired }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  const submit = async (event) => {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setError(null);

    try {
      const result = await api.auth.login(username, password);
      // Clear the password from component state immediately on success; there
      // is no reason for it to remain in memory after the exchange.
      setPassword("");
      onAuthenticated(result.user, result.csrfToken);
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.status === 429
          ? "Too many attempts. Wait a few minutes before trying again."
          : "Invalid username or password.";
      setError(message);
      setStatus("idle");
      setPassword("");
      // Move focus to the alert so a screen reader announces it immediately.
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  };

  return (
    <div className="login">
      <div className="login__panel">
        <motion.div
          className="login__card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <Link to="/" className="login__brand">
            <span className="login__mark" aria-hidden="true" />
            <span>{site.name}</span>
          </Link>

          <h1 className="login__title">Analytics console</h1>
          <p className="login__subtitle">
            Private. This area is not linked from the site and is excluded from search engines.
          </p>

          {setupRequired && (
            <div className="login__setup" role="note">
              <strong>No administrator account exists yet.</strong>
              <span>
                Create one on the server with <code>npm run admin:create</code>. There is
                deliberately no sign-up form here.
              </span>
            </div>
          )}

          <form onSubmit={submit} className="login__form" noValidate>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            {error && (
              <p
                className="login__error"
                role="alert"
                tabIndex={-1}
                ref={errorRef}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn--block"
              disabled={status === "submitting" || !username || !password}
            >
              {status === "submitting" ? "Signing in…" : "Sign in"}
              {status !== "submitting" && (
                <span className="btn__arrow" aria-hidden="true">→</span>
              )}
            </button>
          </form>

          <p className="login__foot">
            <Link to="/">← Back to the portfolio</Link>
          </p>
        </motion.div>
      </div>

      {/* Decorative half: the same brand language as the public site. */}
      <div className="login__aside" aria-hidden="true">
        <div className="login__aside-inner">
          <p className="login__aside-eyebrow">First-party analytics</p>
          <p className="login__aside-text">
            Visitors, sessions, journeys and events — collected by software built for this site,
            stored in PostgreSQL, and shared with nobody.
          </p>
          <div className="login__aside-grid" />
        </div>
      </div>
    </div>
  );
}
