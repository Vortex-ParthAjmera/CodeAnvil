/**
 * Shared multicolor palette for CodeAnvil's 3D scenes.
 * The brand accent (warm amber) leads; blue/green/magenta add life.
 */
export const PALETTE = [
  "#f59e0b", // amber — brand lead
  "#38bdf8", // electric blue
  "#34d399", // emerald
  "#f472b6", // magenta
  "#a78bfa", // violet
] as const;

export type PaletteHue = (typeof PALETTE)[number];

/** Pick a hue by index, cycling through the palette. */
export function hue(i: number): PaletteHue {
  return PALETTE[i % PALETTE.length];
}
