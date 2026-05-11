import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

function getInitialDemoMode() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("demo") === "1" ||
    localStorage.getItem("tradepilot_demo_mode") === "1"
  );
}

function Root() {
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);

  function enterDemoMode() {
    localStorage.setItem("tradepilot_demo_mode", "1");
    setDemoMode(true);

    const url = new URL(window.location.href);
    url.searchParams.set("demo", "1");
    window.history.replaceState({}, "", url.toString());
  }

  function exitDemoMode() {
    localStorage.removeItem("tradepilot_demo_mode");
    setDemoMode(false);

    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    window.history.replaceState({}, "", url.toString());
  }

  if (demoMode) {
    return (
      <ErrorBoundary>
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderRadius: "999px",
            border: "1px solid rgba(110, 231, 183, 0.4)",
            background: "rgba(0, 0, 0, 0.82)",
            color: "white",
            padding: "10px 16px",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
            fontSize: "14px",
          }}
        >
          <span style={{ color: "#a7f3d0", fontWeight: 900 }}>
            评委演示模式
          </span>
          <button
            type="button"
            onClick={exitDemoMode}
            style={{
              border: 0,
              borderRadius: "999px",
              background: "#6ee7b7",
              color: "#020617",
              padding: "6px 12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
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
        style={{
          position: "fixed",
          left: "50%",
          bottom: "28px",
          transform: "translateX(-50%)",
          zIndex: 999999,
          border: "0",
          borderRadius: "999px",
          background: "#6ee7b7",
          color: "#020617",
          padding: "16px 30px",
          fontSize: "17px",
          fontWeight: 900,
          boxShadow: "0 18px 50px rgba(16,185,129,0.35)",
          cursor: "pointer",
        }}
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
