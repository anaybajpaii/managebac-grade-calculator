import { CATCH_ALL } from "../engine/categories";
import { validateStarts } from "../engine/custom-bounds";
import type { CategoryMethod } from "../engine/types";
import type { KeyValueStore } from "./store";
import type { ClassSettings, Weighting } from "./types";

export const DEFAULT_WEIGHTINGS: Weighting[] = [{ name: CATCH_ALL, weight: 100 }];

export function defaultSettings(): ClassSettings {
  return {
    version: 1,
    weightings: DEFAULT_WEIGHTINGS.map((w) => ({ ...w })),
    method: "average",
  };
}

export function settingsKey(classId: string): string {
  return `class:${classId}`;
}

function isMethod(value: unknown): value is CategoryMethod {
  return value === "average" || value === "points";
}

function cleanWeightings(raw: unknown): Weighting[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Weighting[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { name, weight } = item as Record<string, unknown>;
    if (typeof name !== "string" || typeof weight !== "number") continue;
    const trimmed = name.trim();
    if (trimmed === "" || !Number.isFinite(weight) || weight < 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name: trimmed, weight });
  }
  return result;
}

export function normalizeSettings(raw: unknown): ClassSettings {
  const defaults = defaultSettings();
  if (typeof raw !== "object" || raw === null) return defaults;
  const record = raw as Record<string, unknown>;
  const weightings = cleanWeightings(record.weightings);
  const result: ClassSettings = {
    version: 1,
    weightings: weightings.length > 0 ? weightings : defaults.weightings,
    method: isMethod(record.method) ? record.method : defaults.method,
  };
  if (record.weightSource === "page" || record.weightSource === "custom") result.weightSource = record.weightSource;
  const extras = cleanWeightings(record.extraWeightings);
  if (extras.length > 0) result.extraWeightings = extras;
  if (typeof record.subjectName === "string" && record.subjectName.trim() !== "") {
    result.subjectName = record.subjectName.trim();
  }
  if (record.level === "SL" || record.level === "HL") result.level = record.level;
  const starts = record.customStarts;
  if (Array.isArray(starts) && starts.every((n) => typeof n === "number") && validateStarts(starts) === null) {
    result.customStarts = [...starts];
  }
  return result;
}

export async function loadSettings(store: KeyValueStore, classId: string): Promise<ClassSettings> {
  return normalizeSettings(await store.get(settingsKey(classId)));
}

export async function saveSettings(
  store: KeyValueStore,
  classId: string,
  settings: ClassSettings,
): Promise<void> {
  await store.set(settingsKey(classId), normalizeSettings(settings));
}

export async function resetSettings(store: KeyValueStore, classId: string): Promise<ClassSettings> {
  await store.remove(settingsKey(classId));
  return defaultSettings();
}