/**
 * Shared multicolor palette for CodeAnvil's 3D scenes.
 * The brand accent (violet) leads; cyan/green/magenta/amber add life.
 */
export const PALETTE = [
  "#a78bfa", // violet — brand lead
  "#38bdf8", // cyan
  "#34d399", // emerald
  "#f472b6", // magenta
  "#fbbf24", // amber
] as const;

export type PaletteHue = (typeof PALETTE)[number];

/** Pick a hue by index, cycling through the palette. */
export function hue(i: number): PaletteHue {
  return PALETTE[i % PALETTE.length];
}
