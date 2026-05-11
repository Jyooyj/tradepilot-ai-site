import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

function Root() {
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem("tradepilot_demo_mode") === "1";
  });

  function enterDemoMode() {
    localStorage.setItem("tradepilot_demo_mode", "1");
    setDemoMode(true);
  }

  function exitDemoMode() {
    localStorage.removeItem("tradepilot_demo_mode");
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
      <button
        type="button"
        onClick={enterDemoMode}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-300/40 bg-emerald-300 px-7 py-4 text-base font-black text-black shadow-2xl shadow-emerald-500/20"
      >
        评委快速体验 Demo｜无需注册
      </button>

      <AuthGate>
        <App />
      </AuthGate>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
