import type { BandSet } from "./types";

/** Number of editable boundaries: the minimum % for grades 2 to 7. */
export const START_COUNT = 6;

export function validateStarts(starts: number[]): string | null {
  if (starts.length !== START_COUNT) return "Enter the minimum percentage for grades 2 to 7.";
  let previous = 0;
  for (const [i, start] of starts.entries()) {
    const grade = i + 2;
    if (!Number.isFinite(start)) return `Grade ${grade} needs a number.`;
    if (start > 100) return "Boundaries cannot go above 100.";
    if (start <= previous) {
      return i === 0 ? "Grade 2 must start above 0." : `Grade ${grade} must start above grade ${grade - 1}.`;
    }
    previous = start;
  }
  return null;
}

/** Turns "minimum % for grades 2..7" into the same shape as the official bands. */
export function boundsFromStarts(starts: number[]): BandSet {
  const froms = [0, ...starts];
  return {
    max: 100,
    bands: froms.map((from, i) => [from, froms[i + 1] ?? 100]),
  };
}

export function startsFromBands(overall: BandSet): number[] {
  return overall.bands.slice(1).map((band) => Math.round((band[0] / overall.max) * 1000) / 10);
}
