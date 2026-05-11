import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import LoginGate from "./LoginGate.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <LoginGate>
      <App />
    </LoginGate>
  </ErrorBoundary>
);
