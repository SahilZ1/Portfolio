/**
 * Route table.
 *
 * Code splitting: the page a first-time visitor is most likely to land on
 * (Home) is bundled eagerly; everything else is lazily loaded. The admin
 * console in particular is a separate chunk that a normal visitor never
 * downloads — it is the largest part of the app and of no use to them.
 *
 * Suspense placement matters. The boundary sits INSIDE `Layout`, around the
 * routed content only, rather than around the whole `<Routes>` tree. Wrapping
 * everything means the navigation and footer unmount on every transition to a
 * lazy route, so the entire page — chrome included — blinks out and is replaced
 * by the loading bar. Keeping the boundary inside the layout means the shell
 * stays put and only the content area waits.
 */

import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import Home from "./pages/Home.jsx";

const About = lazy(() => import("./pages/About.jsx"));
const Experience = lazy(() => import("./pages/Experience.jsx"));
const Projects = lazy(() => import("./pages/Projects.jsx"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail.jsx"));
const Skills = lazy(() => import("./pages/Skills.jsx"));
const Certifications = lazy(() => import("./pages/Certifications.jsx"));
const Education = lazy(() => import("./pages/Education.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

/**
 * Suspense fallback.
 *
 * Deliberately almost nothing: a thin progress bar, not a spinner or a skeleton
 * page. Lazy chunks on a same-origin connection resolve in tens of
 * milliseconds, and a full-page loading state that flashes for 40ms is worse
 * than no loading state at all.
 */
function RouteFallback() {
  return <div className="route-loading" role="status" aria-label="Loading" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* The admin console sits outside the public Layout: no site
            navigation, no footer, no analytics notice, and its own shell. */}
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminApp />
            </Suspense>
          }
        />

        <Route element={<Layout />}>
          {/* Home is eager, so it paints without waiting on a chunk. */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/education" element={<Education />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
