import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function TestPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="rounded-3xl bg-emerald-300 p-10 text-center text-black">
        <h1 className="text-5xl font-black">MAIN.JSX 已经生效</h1>
        <p className="mt-4 text-xl font-bold">如果你看到这行字，说明入口文件没问题。</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<TestPage />);
