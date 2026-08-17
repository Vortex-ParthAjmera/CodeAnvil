import { useState } from "react";
import { PanelTopClose, PanelTopOpen } from "lucide-react";

/** Per-stage HUD visibility state (resets whenever the stage remounts). */
export function useStageHud() {
  const [open, setOpen] = useState(true);
  return {
    hudOpen: open,
    toggleHud: () => setOpen((o) => !o),
  };
}

/**
 * Collapse/expand toggle pinned to the stage's top-right corner.
 * The top HUD panels reserve `right-11` so the button never covers them;
 * when hidden, the full scene is visible and the button stays to restore.
 */
export function HudToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={open ? "Hide stage overlays" : "Show stage overlays"}
      aria-label={open ? "Hide stage overlays" : "Show stage overlays"}
      className="pointer-events-auto absolute right-2 top-2 z-30 flex h-6 w-6 items-center justify-center rounded-md border border-ink-600/70 bg-ink-950/85 text-ink-300 shadow-lg backdrop-blur-sm transition-colors hover:border-ember-500/60 hover:text-ember-300"
    >
      {open ? <PanelTopClose size={13} /> : <PanelTopOpen size={13} />}
    </button>
  );
}
