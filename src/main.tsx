import React from "react";
import ReactDOM from "react-dom/client";
// Side effect: bundles Monaco locally (no CDN fetch) and wires its workers.
// Must be imported before the editor renders.
import "./lib/monacoSetup";
import App from "./App";
import "./index.css";
import "./theme2.css";
import "./theme3.css";
import "./theme4.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element #root not found. Check index.html.");
}
