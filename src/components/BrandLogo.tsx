import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { getMode, subscribeMode } from "../lib/mode";
import { cn } from "../lib/cn";
import darkLogo from "../assets/logos/codeanvil-dark.png";
import lightLogo from "../assets/logos/codeanvil-light.png";

const TILE = "select-none rounded-lg object-contain shadow-lg ring-1 ring-ink-700/70";

/**
 * The CodeAnvil brand lockup. The dark variant ships with a near-black
 * background (for dark mode), the light variant with a white background
 * (for light mode). Both are stacked and cross-faded so the theme toggle
 * dissolves between the two instead of swapping instantly.
 */
export function BrandLogo({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribeMode, getMode);
  const reduce = useReducedMotion();
  const fade = reduce ? "transition-none" : "transition-opacity duration-500";
  return (
    <div className={cn("relative inline-block", className)}>
      {/* Anchor in normal flow — keeps the outer box sized exactly like
          the old single <img> (h-* w-auto, intrinsic 4:3 aspect). */}
      <img
        src={darkLogo}
        alt="CodeAnvil"
        draggable={false}
        className={cn(
          "h-full w-auto aspect-[4/3]",
          TILE,
          fade,
          mode === "dark" ? "opacity-100" : "opacity-0",
        )}
      />
      <img
        src={lightLogo}
        alt=""
        aria-hidden
        draggable={false}
        className={cn(
          "absolute inset-0 h-full w-full",
          TILE,
          fade,
          mode === "light" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
