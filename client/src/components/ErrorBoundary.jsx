/**
 * Top-level error boundary.
 *
 * Without one of these, any error thrown while React is rendering or committing
 * unmounts the entire tree and leaves an empty `<div id="root">` — a completely
 * blank white page with the real cause visible only in the console. That is the
 * worst possible failure mode, because it looks identical to a build problem, a
 * CSS problem, a server problem and a routing problem.
 *
 * With this in place the page always renders *something*, and in development it
 * renders the actual error and component stack, so the cause is on screen
 * rather than hidden.
 *
 * Note this catches render/commit errors only. Errors inside event handlers and
 * async callbacks do not propagate to a boundary — those are handled where they
 * occur (see lib/analytics.js, which swallows its own failures by design).
 */

import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Keep the full detail in the console for the stack trace and source maps.
    console.error("Unhandled React error:", error, info?.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const isDev = import.meta.env?.DEV;

    return (
      <div className="crash" role="alert">
        <div className="crash__inner">
          <span className="crash__mark" aria-hidden="true" />
          <h1 className="crash__title">Something broke while rendering this page.</h1>
          <p className="crash__body">
            This is a bug in the site, not something you did. Reloading may clear it.
          </p>

          <div className="crash__actions">
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Reload the page
            </button>
            <a className="btn btn--secondary" href="/">
              Back to home
            </a>
          </div>

          {/*
            The message and stack are shown in development only. In production
            they would expose internal file paths and component structure to a
            visitor, which is reconnaissance for no benefit.
          */}
          {isDev && (
            <details className="crash__details" open>
              <summary>Error detail (development only)</summary>
              <pre className="crash__pre">{String(error?.stack || error?.message || error)}</pre>
              {info?.componentStack && (
                <pre className="crash__pre">{info.componentStack}</pre>
              )}
            </details>
          )}
        </div>
      </div>
    );
  }
}
