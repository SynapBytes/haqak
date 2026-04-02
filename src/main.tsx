import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { analytics } from "@/lib/analytics";
import { initSentry } from "@/lib/sentry";

// Initialise observability before the React tree renders.
initSentry();
analytics.init();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
