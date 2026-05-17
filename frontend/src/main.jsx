/**
 * main.jsx — Vite / React entry point
 *
 * No changes from the original aside from confirming App already
 * embeds <AuthProvider> internally via App.jsx.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
