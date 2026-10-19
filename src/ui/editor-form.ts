import { CATCH_ALL } from "../engine/categories";
import { START_COUNT, validateStarts } from "../engine/custom-bounds";
import type { CategoryMethod } from "../engine/types";
import { TIMEZONES } from "../storage/global";
import type { Weighting } from "../storage/types";

export interface EditorSave {
  weightings: Weighting[];
  weightSource: "page" | "custom";
  extraWeightings: Weighting[];
  method: CategoryMethod;
  subjectName: string | null;
  level: "SL" | "HL" | null;
  timezone: number;
  customStarts: number[] | null;
}

export interface RawForm {
  weightings: { name: string; weight: string }[];
  usePage: boolean;
  extras: { name: string; weight: string }[];
  method: string;
  subjectName: string;
  level: string;
  timezone: string;
  useCustom: boolean;
  starts: string[];
}

export type FormResult = { ok: true; value: EditorSave } | { ok: false; error: string };

function toNumber(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

export function parseForm(raw: RawForm): FormResult {
  const weightings: Weighting[] = [];
  const seen = new Set<string>();
  if (raw.usePage) {
    // The page's weights are used live; keep the rows only as a fallback copy.
    for (const row of raw.weightings) {
      const name = row.name.trim();
      const weight = toNumber(row.weight);
      if (name === "" || !Number.isFinite(weight) || weight < 0 || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      weightings.push({ name, weight });
    }
    if (!weightings.some((w) => w.weight > 0)) weightings.splice(0, weightings.length, { name: CATCH_ALL, weight: 100 });
    const extras = parseExtras(raw.extras);
    if (!extras.ok) return extras;
    return finish(raw, weightings, "page", extras.value);
  }
  for (const row of raw.weightings) {
    const name = row.name.trim();
    if (name === "" && row.weight.trim() === "") continue;
    if (name === "") return { ok: false, error: "Every category needs a name." };
    const weight = toNumber(row.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      return { ok: false, error: `Enter a weight (0 or more) for "${name}".` };
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return { ok: false, error: `"${name}" appears twice.` };
    seen.add(key);
    weightings.push({ name, weight });
  }
  if (weightings.length === 0) return { ok: false, error: "Add at least one category." };
  if (!weightings.some((w) => w.weight > 0)) {
    return { ok: false, error: "At least one weight must be above 0." };
  }

  return finish(raw, weightings, "custom", []);
}

function parseExtras(rows: RawForm["extras"]): { ok: true; value: Weighting[] } | { ok: false; error: string } {
  const result: Weighting[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = row.name.trim();
    if (name === "" && row.weight.trim() === "") continue;
    if (name === "") return { ok: false, error: "Every extra category needs a name." };
    const weight = toNumber(row.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      return { ok: false, error: `Enter a weight (0 or more) for "${name}".` };
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return { ok: false, error: `"${name}" appears twice.` };
    seen.add(key);
    result.push({ name, weight });
  }
  return { ok: true, value: result };
}

function finish(
  raw: RawForm,
  weightings: Weighting[],
  weightSource: "page" | "custom",
  extraWeightings: Weighting[],
): FormResult {
  const timezone = Number(raw.timezone);
  if (!(TIMEZONES as readonly number[]).includes(timezone)) {
    return { ok: false, error: "Choose a timezone." };
  }

  let customStarts: number[] | null = null;
  if (raw.useCustom) {
    const starts = raw.starts.slice(0, START_COUNT).map(toNumber);
    const problem = validateStarts(starts);
    if (problem) return { ok: false, error: problem };
    customStarts = starts;
  }

  return {
    ok: true,
    value: {
      weightings,
      weightSource,
      extraWeightings,
      method: raw.method === "points" ? "points" : "average",
      subjectName: raw.subjectName.trim() === "" ? null : raw.subjectName.trim(),
      level: raw.level === "SL" || raw.level === "HL" ? raw.level : null,
      timezone,
      customStarts,
    },
  };
}

const SMALL_WORDS = new Set(["and", "of", "in", "for", "the", "a"]);

/** The boundaries PDF uses capitals; make the names readable in a dropdown. */
export function prettySubject(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}