/**
 * theme3d — mode/story-theme-aware colors for the Three.js stages.
 *
 * The DOM palette already flips with `data-mode` (light/dark) and
 * `data-theme` (story themes) via CSS variables, so the 3D scenes read the
 * SAME variables: surfaces lighten, text darkens, and accents deepen for
 * contrast — instead of just being dimmed by CSS opacity. A MutationObserver
 * re-reads the variables whenever the root attributes change, so toggling
 * light mode or applying an Arc/Verdant theme repaints every live canvas.
 */
import { useEffect, useState } from "react";

export interface Theme3DPalette {
  /** Minor grid lines (ink-800). */
  gridCell: string;
  /** Major grid lines (ink-600). */
  gridSection: string;
  /** Empty cell faces (ink-850). */
  emptyCell: string;
  /** Strong text — bar values, node labels (ink-100). */
  textStrong: string;
  /** Dim text — indices, small captions (ink-400). */
  textDim: string;
  /** Unhighlighted bars (ink-500). */
  barDefault: string;
  /** Muted/out-of-range cells (ink-700). */
  barRange: string;
  /** Sky accent — reading / compare / frontier (arc-400). */
  arc: string;
  /** Bright sky — edges, events (arc-300). */
  arcBright: string;
  /** Deep sky — visited cells (arc-500). */
  arcDeep: string;
  /** Violet accent — mid / swap / goal (ember-400). */
  ember: string;
  /** Bright violet — key / current (ember-300). */
  emberBright: string;
  /** Green accent — max / sorted / start / path (verdant-400). */
  verdant: string;
  /** Deep green — sorted (verdant-500). */
  verdantDeep: string;
  /** Two-sum found pair — kept pink in both modes (reads on white). */
  found: string;
  /** Page background (ink-950) — fog + ambient haze blend with it. */
  background: string;
  /**
   * Light-rig multipliers. Each scene keeps its own tuned baseline intensity
   * and multiplies: light mode lowers ambient/directional so saturated colors
   * stay vivid instead of washing toward white, while the accent light is
   * boosted so its colored glow pools remain visible on light backgrounds.
   */
  lighting: {
    ambient: number;
    directional: number;
    accent: number;
  };
}

const DARK_FALLBACK: Theme3DPalette = {
  gridCell: "#1c1d24",
  gridSection: "#363947",
  emptyCell: "#17181e",
  textStrong: "#e7e9ef",
  textDim: "#7a7f92",
  barDefault: "#4a4e5e",
  barRange: "#262833",
  arc: "#38bdf8",
  arcBright: "#7dd3fc",
  arcDeep: "#0ea5e9",
  ember: "#a78bfa",
  emberBright: "#d6b6ff",
  verdant: "#34d399",
  verdantDeep: "#10b981",
  found: "#f472b6",
  background: "#0b0c0f",
  lighting: { ambient: 1, directional: 1, accent: 1 },
};

function readPalette(): Theme3DPalette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    (cs.getPropertyValue(name) || "").trim() || fallback;
  const light =
    document.documentElement.getAttribute("data-mode") === "light";
  return {
    gridCell: v("--color-ink-800", DARK_FALLBACK.gridCell),
    gridSection: v("--color-ink-600", DARK_FALLBACK.gridSection),
    emptyCell: v("--color-ink-850", DARK_FALLBACK.emptyCell),
    textStrong: v("--color-ink-100", DARK_FALLBACK.textStrong),
    textDim: v("--color-ink-400", DARK_FALLBACK.textDim),
    barDefault: v("--color-ink-500", DARK_FALLBACK.barDefault),
    barRange: v("--color-ink-700", DARK_FALLBACK.barRange),
    arc: v("--color-arc-400", DARK_FALLBACK.arc),
    arcBright: v("--color-arc-300", DARK_FALLBACK.arcBright),
    arcDeep: v("--color-arc-500", DARK_FALLBACK.arcDeep),
    ember: v("--color-ember-400", DARK_FALLBACK.ember),
    emberBright: v("--color-ember-300", DARK_FALLBACK.emberBright),
    verdant: v("--color-verdant-400", DARK_FALLBACK.verdant),
    verdantDeep: v("--color-verdant-500", DARK_FALLBACK.verdantDeep),
    found: DARK_FALLBACK.found,
    background: v("--color-ink-950", DARK_FALLBACK.background),
    // Light mode: dial ambient/directional down so colors don't wash toward
    // white, and lift the accent light so its glow pools still read.
    lighting: light
      ? { ambient: 0.62, directional: 0.85, accent: 1.18 }
      : DARK_FALLBACK.lighting,
  };
}

/** Live palette — re-reads when data-mode or data-theme changes on <html>. */
export function useTheme3D(): Theme3DPalette {
  const [palette, setPalette] = useState<Theme3DPalette>(readPalette);
  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return palette;
}
