/**
 * Client entry point.
 *
 * StrictMode is on in development, which double-invokes effects deliberately to
 * surface side-effect bugs. The analytics client de-duplicates page views
 * within a short window precisely so that this does not double-count.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/components.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
