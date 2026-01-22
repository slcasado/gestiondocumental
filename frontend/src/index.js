import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver errors (benign warnings from Radix UI)
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded|ResizeObserver loop completed)]/;
const resizeObserverErrFilter = (e) => {
  if (e.message && !resizeObserverLoopErrRe.test(e.message)) {
    console.error(e);
  }
};
window.addEventListener('error', resizeObserverErrFilter);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
