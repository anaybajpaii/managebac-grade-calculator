export const TONES = [
  { id: "mono", label: "Black and white" },
  { id: "olive", label: "Olive" },
  { id: "clay", label: "Clay" },
  { id: "slate", label: "Slate" },
  { id: "ink", label: "Midnight ink" },
] as const;

export const MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "auto", label: "Match my system" },
] as const;

export type ToneId = (typeof TONES)[number]["id"];
export type ModeId = (typeof MODES)[number]["id"];

export interface Appearance {
  tone: ToneId;
  mode: ModeId;
}

export const DEFAULT_APPEARANCE: Appearance = { tone: "mono", mode: "light" };

export function isTone(value: unknown): value is ToneId {
  return TONES.some((t) => t.id === value);
}

export function isMode(value: unknown): value is ModeId {
  return MODES.some((m) => m.id === value);
}
