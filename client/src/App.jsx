/**
 * Route table.
 *
 * Code splitting: the page a first-time visitor is most likely to land on
 * (Home) is bundled eagerly; everything else is lazily loaded.
 *
 * The analytics admin console is retained in the source code for demonstration
 * purposes but is disabled on the public site.
 *
 * Suspense placement matters. The boundary sits INSIDE `Layout`, around the
 * routed content only, rather than around the whole `<Routes>` tree.
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

// Analytics admin console retained in the project but disabled on the public site.
// const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

/**
 * Suspense fallback.
 */
function RouteFallback() {
  return <div className="route-loading" role="status" aria-label="Loading" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/*
          Analytics admin console disabled.

          The original /admin route and AdminApp implementation remain in the
          source code but are intentionally not mounted on the public site.
        */}

        <Route element={<Layout />}>
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