import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <AuthGate>
      <App />
    </AuthGate>
  </ErrorBoundary>
);
