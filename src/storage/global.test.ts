import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE } from "../config";
import { defaultGlobal, loadGlobal, normalizeGlobal, saveGlobal } from "./global";
import { createMemoryStore } from "./store";

describe("global settings", () => {
  it("defaults to the default timezone", async () => {
    expect(await loadGlobal(createMemoryStore())).toEqual({ version: 1, timezone: DEFAULT_TIMEZONE });
  });

  it("saves and loads the timezone", async () => {
    const store = createMemoryStore();
    await saveGlobal(store, { version: 1, timezone: 2 });
    expect((await loadGlobal(store)).timezone).toBe(2);
  });

  it("ignores invalid values", () => {
    expect(normalizeGlobal({ timezone: 7 })).toEqual(defaultGlobal());
    expect(normalizeGlobal({ timezone: "2" })).toEqual(defaultGlobal());
    expect(normalizeGlobal(null)).toEqual(defaultGlobal());
  });
});