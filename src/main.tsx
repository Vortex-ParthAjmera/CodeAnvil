import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import App from "./App";
import "./index.css";
import { initMode } from "./lib/mode";

// Apply the saved/system color mode before first paint (no flash).
initMode();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
