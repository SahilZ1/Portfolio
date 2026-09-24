/**
 * Admin console shell.
 *
 * Owns authentication state for the whole /admin subtree. The session check
 * runs once on mount; until it resolves, neither the login screen nor the
 * dashboard is rendered, so an authenticated admin never sees the login form
 * flash before being let through.
 *
 * Authorisation is enforced entirely on the server. This component decides only
 * what to *render*; every analytics endpoint independently rejects an
 * unauthenticated request, so a tampered client gets nothing.
 */

import { useCallback, useEffect, useState } from "react";
import { Seo } from "../components/Seo.jsx";
import { api, setCsrfToken, ApiError } from "../lib/api.js";
import { AdminLogin } from "./AdminLogin.jsx";
import { Dashboard } from "./Dashboard.jsx";
import "./admin.css";

export default function AdminApp() {
  const [state, setState] = useState({ status: "checking", user: null, setupRequired: false });

  const refreshSession = useCallback(async () => {
    try {
      const session = await api.auth.session();
      if (session.authenticated) {
        setCsrfToken(session.csrfToken);
        setState({ status: "authenticated", user: session.user, setupRequired: false });
      } else {
        setCsrfToken(null);
        setState({
          status: "anonymous",
          user: null,
          setupRequired: Boolean(session.setupRequired),
        });
      }
    } catch {
      // Network failure or a server that is down. Treat as anonymous rather
      // than rendering a broken console.
      setCsrfToken(null);
      setState({ status: "anonymous", user: null, setupRequired: false });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const onAuthenticated = useCallback((user, csrfToken) => {
    setCsrfToken(csrfToken);
    setState({ status: "authenticated", user, setupRequired: false });
  }, []);

  const onSignOut = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      // A 401 here just means the session had already expired.
      if (!(error instanceof ApiError) || error.status !== 401) {
        // Nothing actionable; the local state is cleared either way.
      }
    }
    setCsrfToken(null);
    setState({ status: "anonymous", user: null, setupRequired: false });
  }, []);

  return (
    <>
      {/* The console must never be indexed, and it carries no public metadata. */}
      <Seo title="Console" path="/admin" noIndex />

      {state.status === "checking" && (
        <div className="console console--checking">
          <div className="console__boot" role="status" aria-label="Checking session">
            <span className="console__boot-bar" />
          </div>
        </div>
      )}

      {state.status === "anonymous" && (
        <AdminLogin onAuthenticated={onAuthenticated} setupRequired={state.setupRequired} />
      )}

      {state.status === "authenticated" && (
        <Dashboard user={state.user} onSignOut={onSignOut} />
      )}
    </>
  );
}
