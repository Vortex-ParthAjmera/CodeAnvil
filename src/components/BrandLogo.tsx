import { useSyncExternalStore } from "react";
import { getMode, subscribeMode } from "../lib/mode";
import { cn } from "../lib/cn";
import darkLogo from "../assets/logos/codeanvil-dark.png";
import lightLogo from "../assets/logos/codeanvil-light.png";

/**
 * The CodeAnvil brand lockup. The dark variant ships with a near-black
 * background (for dark mode), the light variant with a white background
 * (for light mode) — pick by the live mode so the logo always blends.
 */
export function BrandLogo({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribeMode, getMode);
  return (
    <img
      src={mode === "light" ? lightLogo : darkLogo}
      alt="CodeAnvil"
      draggable={false}
      className={cn(
        "select-none rounded-md object-contain shadow-sm",
        className,
      )}
    />
  );
}
