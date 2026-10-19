import { DEFAULT_TIMEZONE } from "../config";
import type { KeyValueStore } from "./store";
import type { GlobalSettings } from "./types";

export const GLOBAL_KEY = "global";
export const TIMEZONES = [1, 2, 3] as const;

export function defaultGlobal(): GlobalSettings {
  return { version: 1, timezone: DEFAULT_TIMEZONE };
}

export function normalizeGlobal(raw: unknown): GlobalSettings {
  const defaults = defaultGlobal();
  if (typeof raw !== "object" || raw === null) return defaults;
  const { timezone } = raw as Record<string, unknown>;
  const valid = typeof timezone === "number" && (TIMEZONES as readonly number[]).includes(timezone);
  return { version: 1, timezone: valid ? timezone : defaults.timezone };
}

export async function loadGlobal(store: KeyValueStore): Promise<GlobalSettings> {
  return normalizeGlobal(await store.get(GLOBAL_KEY));
}

export async function saveGlobal(store: KeyValueStore, settings: GlobalSettings): Promise<void> {
  await store.set(GLOBAL_KEY, normalizeGlobal(settings));
}