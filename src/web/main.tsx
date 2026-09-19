import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "./styles.css";
import App from "./app.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";

// TEMPLATE-MANAGED (__ prefix) — do not edit.
// Mounts the app. Add global providers in components/provider.tsx and
// routes in app.tsx; both stay editable.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>,
);
