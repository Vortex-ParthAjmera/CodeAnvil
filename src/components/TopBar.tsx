import { useSyncExternalStore } from "react";
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import type { Route } from "../router";
import { getMode, subscribeMode, toggleMode } from "../lib/mode";

const ROUTE_LABELS: Partial<Record<Route["name"], string>> = {
  dashboard: "Dashboard",
  roadmap: "Roadmap",
  atlas: "DSA Atlas",
  lab: "Playback Lab",
  saved: "Saved Sessions",
  arena: "DSA Arena",
  story: "Story Mode",
  duel: "Skill Duel",
  visualize: "Visualize Your Code",
  auth: "Account",
};

/**
 * Slim app chrome above every screen (dashboard, lab, atlas, …):
 * sidebar minimize toggle on the left, current module label, and the
 * light/dark mode toggle on the right. The landing page keeps its own
 * header with its own mode toggle.
 */
export function TopBar({
  route,
  collapsed,
  onToggleCollapsed,
}: {
  route: Route;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const mode = useSyncExternalStore(subscribeMode, getMode);
  return (
    <header className="relative z-20 flex h-11 shrink-0 items-center gap-2.5 border-b border-ink-700 bg-ink-900/70 px-3 backdrop-blur">
      <button
        type="button"
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
        {ROUTE_LABELS[route.name] ?? "CodeAnvil"}
      </p>
      <button
        type="button"
        onClick={() => toggleMode()}
        title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="ml-auto rounded-md border border-ink-700 bg-ink-800 p-1.5 text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
      >
        {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
