import { useRef, useState } from "react";
import { GripHorizontal, GripVertical } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * A draggable splitter between two workspace panels (VS Code style).
 *
 * The physical bar sits between two `[data-panel]` siblings inside a
 * `[data-workspace]` flex container. In the row layout it splits columns
 * (drag horizontally); in the column layout it splits rows (drag vertically).
 * The orientation is detected from the element's own geometry, so no JS
 * breakpoint is needed.
 *
 * Dragging converts pixel deltas into the same per-panel weight model the
 * toolbar sliders use: it mutates `flex-grow` live during the drag (no React
 * re-render churn) and commits measured pixel sizes on release.
 */
export function PanelSplitter({
  a,
  b,
  value,
  onCommit,
  onStep,
}: {
  a: string;
  b: string;
  value: number;
  onCommit: (pixels: Record<string, number>) => void;
  onStep: (delta: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  /** "x" = splits columns (drag horizontally), "y" = splits rows (drag vertically). */
  function axis(): "x" | "y" {
    const rect = ref.current?.getBoundingClientRect();
    // A vertical bar (taller than wide) splits columns; a horizontal bar splits rows.
    return rect && rect.height > rect.width ? "x" : "y";
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const workspace = ref.current?.closest("[data-workspace]") as HTMLElement | null;
    const elA = workspace?.querySelector(`[data-panel="${a}"]`) as HTMLElement | null;
    const elB = workspace?.querySelector(`[data-panel="${b}"]`) as HTMLElement | null;
    if (!workspace || !elA || !elB) return;

    e.preventDefault();
    const dir = axis();
    const workspaceSize =
      dir === "x"
        ? workspace.getBoundingClientRect().width
        : workspace.getBoundingClientRect().height;
    const pxPerUnit = workspaceSize / 14;
    const start = dir === "x" ? e.clientX : e.clientY;
    let gA = Number.parseFloat(getComputedStyle(elA).flexGrow) || 5;
    let gB = Number.parseFloat(getComputedStyle(elB).flexGrow) || 5;

    const onMove = (ev: PointerEvent) => {
      const delta = ((dir === "x" ? ev.clientX : ev.clientY) - start) / pxPerUnit;
      elA.style.flexGrow = String(gA + delta);
      elB.style.flexGrow = String(gB - delta);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setActive(false);

      // Commit the real on-screen sizes (all panels) so state matches the DOM.
      const pixels: Record<string, number> = {};
      for (const el of workspace.querySelectorAll("[data-panel]")) {
        const id = el.getAttribute("data-panel");
        if (id) {
          pixels[id] =
            dir === "x"
              ? el.getBoundingClientRect().width
              : el.getBoundingClientRect().height;
        }
      }
      elA.style.flexGrow = "";
      elB.style.flexGrow = "";
      onCommit(pixels);
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = dir === "x" ? "col-resize" : "row-resize";
    setActive(true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const dir = axis();
    let delta = 0;
    if (dir === "x") {
      if (e.key === "ArrowLeft") delta = 0.5;
      else if (e.key === "ArrowRight") delta = -0.5;
    } else {
      if (e.key === "ArrowUp") delta = 0.5;
      else if (e.key === "ArrowDown") delta = -0.5;
    }
    if (delta === 0) return;
    e.preventDefault();
    onStep(delta);
  }

  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation={axis() === "x" ? "vertical" : "horizontal"}
      aria-valuemin={2}
      aria-valuemax={9}
      aria-valuenow={Math.round(value)}
      aria-label={`Resize ${a} and ${b} panels`}
      title="Drag to resize panels"
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative z-20 flex shrink-0 touch-none select-none items-center justify-center outline-none",
        "h-1.5 w-full cursor-row-resize lg:h-full lg:w-1.5 lg:cursor-col-resize",
        "focus-visible:ring-1 focus-visible:ring-ember-400/70",
        active && "bg-ember-500/10",
      )}
    >
      {/* resting line */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-px w-full rounded-full bg-ink-600/60 transition-colors duration-150 group-hover:bg-ember-400/60 lg:h-full lg:w-px" />
      </div>

      {/* glowing handle on hover / focus / drag */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 group-focus-visible:opacity-100",
          active && "opacity-100",
        )}
      >
        <div className="h-[3px] w-full rounded-full bg-ember-400/90 shadow-[0_0_10px_rgba(251,146,60,0.55)] lg:h-full lg:w-[3px]" />
      </div>

      {/* grip icon: horizontal bar (column layout) */}
      <span className="pointer-events-none absolute inset-0 hidden items-center justify-center group-hover:flex lg:hidden">
        <GripHorizontal size={12} className="text-ember-300" />
      </span>
      {/* grip icon: vertical bar (row layout) */}
      <span className="pointer-events-none absolute inset-0 hidden items-center justify-center group-hover:flex max-lg:hidden">
        <GripVertical size={12} className="text-ember-300" />
      </span>
    </div>
  );
}
