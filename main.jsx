import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

function getInitialDemoMode() {
  const params = new URLSearchParams(window.location.search);
  return (
    localStorage.getItem("tradepilot_demo_mode") === "1" ||
    params.get("demo") === "1"
  );
}

function Root() {
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);

  useEffect(() => {
    const nativeButton = document.getElementById("judge-demo-entry");
    if (nativeButton) {
      nativeButton.style.display = demoMode ? "none" : "block";
    }
  }, [demoMode]);

  function exitDemoMode() {
    localStorage.removeItem("tradepilot_demo_mode");
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    window.history.replaceState({}, "", url.toString());
    setDemoMode(false);
  }

  if (demoMode) {
    return (
      <ErrorBoundary>
        <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-emerald-300/30 bg-black/80 px-4 py-2 text-sm text-white shadow-xl backdrop-blur">
          <span className="font-bold text-emerald-200">评委演示模式</span>
          <button
            onClick={exitDemoMode}
            className="rounded-full bg-emerald-300 px-3 py-1 font-black text-black"
          >
            退出演示
          </button>
        </div>

        <App />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGate>
        <App />
      </AuthGate>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
