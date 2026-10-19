import { describe, expect, it } from "vitest";
import { classIdFromUrl } from "./class-id";
import {
  defaultSettings,
  loadSettings,
  normalizeSettings,
  resetSettings,
  saveSettings,
  settingsKey,
} from "./settings";
import { createMemoryStore } from "./store";
import type { ClassSettings } from "./types";

const physics: ClassSettings = {
  version: 1,
  weightings: [
    { name: "Papers", weight: 60 },
    { name: "Internal assessment", weight: 20 },
    { name: "Practicals", weight: 20 },
  ],
  method: "points",
};

describe("load, save and reset", () => {
  it("returns defaults for a class with nothing saved", async () => {
    const store = createMemoryStore();
    expect(await loadSettings(store, "111")).toEqual(defaultSettings());
  });

  it("round-trips saved settings", async () => {
    const store = createMemoryStore();
    await saveSettings(store, "111", physics);
    expect(await loadSettings(store, "111")).toEqual(physics);
  });

  it("keeps each class separate", async () => {
    const store = createMemoryStore();
    const maths: ClassSettings = {
      version: 1,
      weightings: [{ name: "Exams", weight: 100 }],
      method: "average",
    };
    await saveSettings(store, "111", physics);
    await saveSettings(store, "222", maths);
    expect(await loadSettings(store, "111")).toEqual(physics);
    expect(await loadSettings(store, "222")).toEqual(maths);
    expect(await loadSettings(store, "333")).toEqual(defaultSettings());
  });

  it("resets only the chosen class", async () => {
    const store = createMemoryStore();
    await saveSettings(store, "111", physics);
    await saveSettings(store, "222", physics);
    expect(await resetSettings(store, "111")).toEqual(defaultSettings());
    expect(await loadSettings(store, "111")).toEqual(defaultSettings());
    expect(await loadSettings(store, "222")).toEqual(physics);
  });

  it("does not let later edits to a saved object change what is stored", async () => {
    const store = createMemoryStore();
    const settings = structuredClone(physics);
    await saveSettings(store, "111", settings);
    settings.weightings[0]!.weight = 1;
    expect((await loadSettings(store, "111")).weightings[0]!.weight).toBe(60);
  });

  it("namespaces keys by class id", () => {
    expect(settingsKey("42")).toBe("class:42");
  });
});

describe("normalizeSettings", () => {
  it("falls back to defaults for junk input", () => {
    expect(normalizeSettings(undefined)).toEqual(defaultSettings());
    expect(normalizeSettings(null)).toEqual(defaultSettings());
    expect(normalizeSettings("nope")).toEqual(defaultSettings());
    expect(normalizeSettings(42)).toEqual(defaultSettings());
    expect(normalizeSettings({ weightings: "x", method: 3 })).toEqual(defaultSettings());
  });

  it("drops invalid weightings but keeps the valid ones", () => {
    const result = normalizeSettings({
      weightings: [
        { name: "Good", weight: 40 },
        { name: "", weight: 10 },
        { name: "Negative", weight: -5 },
        { name: "NaN", weight: NaN },
        { name: "Infinite", weight: Infinity },
        { name: "String weight", weight: "30" },
        { weight: 20 },
        null,
        "junk",
        { name: "  Spaced  ", weight: 0 },
      ],
      method: "points",
    });
    expect(result.weightings).toEqual([
      { name: "Good", weight: 40 },
      { name: "Spaced", weight: 0 },
    ]);
    expect(result.method).toBe("points");
  });

  it("removes duplicate names, case-insensitively, keeping the first", () => {
    const result = normalizeSettings({
      weightings: [
        { name: "Papers", weight: 60 },
        { name: "papers", weight: 10 },
      ],
    });
    expect(result.weightings).toEqual([{ name: "Papers", weight: 60 }]);
  });

  it("uses default weightings when none survive cleaning", () => {
    const result = normalizeSettings({ weightings: [{ name: "", weight: 5 }], method: "points" });
    expect(result.weightings).toEqual(defaultSettings().weightings);
    expect(result.method).toBe("points");
  });

  it("rejects unknown averaging methods", () => {
    expect(normalizeSettings({ method: "median" }).method).toBe("average");
  });

  it("repairs bad data when loading from the store", async () => {
    const store = createMemoryStore();
    await store.set(settingsKey("9"), { weightings: [{ name: "Ok", weight: 100 }], method: "bad" });
    expect(await loadSettings(store, "9")).toEqual({
      version: 1,
      weightings: [{ name: "Ok", weight: 100 }],
      method: "average",
    });
  });
});

describe("classIdFromUrl", () => {
  it("reads the class id from a class page url", () => {
    expect(classIdFromUrl("https://school.managebac.com/student/classes/12345678/assignments")).toBe(
      "12345678",
    );
    expect(classIdFromUrl("https://school.managebac.com/student/classes/987")).toBe("987");
    expect(classIdFromUrl("https://school.managebac.com/student/classes/987?x=1#top")).toBe("987");
  });

  it("returns null when there is no class id", () => {
    expect(classIdFromUrl("https://school.managebac.com/student/home")).toBeNull();
    expect(classIdFromUrl("https://school.managebac.com/student/classes/abc")).toBeNull();
    expect(classIdFromUrl("not a url")).toBeNull();
  });
});


describe("subject, level and own boundaries", () => {
  it("keeps valid overrides", () => {
    const result = normalizeSettings({
      weightings: [{ name: "Exams", weight: 100 }],
      method: "average",
      subjectName: "  PHYSICS ",
      level: "HL",
      customStarts: [10, 25, 40, 55, 70, 85],
    });
    expect(result.subjectName).toBe("PHYSICS");
    expect(result.level).toBe("HL");
    expect(result.customStarts).toEqual([10, 25, 40, 55, 70, 85]);
  });

  it("drops invalid overrides instead of keeping them", () => {
    const result = normalizeSettings({ subjectName: "  ", level: "XL", customStarts: [5, 4, 3, 2, 1, 0] });
    expect(result).toEqual(defaultSettings());
    expect("subjectName" in result).toBe(false);
    expect("customStarts" in result).toBe(false);
  });

  it("round-trips overrides per class", async () => {
    const store = createMemoryStore();
    const settings: ClassSettings = { ...physics, subjectName: "PHYSICS", level: "SL", customStarts: [10, 20, 30, 40, 50, 60] };
    await saveSettings(store, "111", settings);
    expect(await loadSettings(store, "111")).toEqual(settings);
    expect(await loadSettings(store, "222")).toEqual(defaultSettings());
  });
});

describe("weight source", () => {
  it("keeps a valid choice and drops anything else", () => {
    expect(normalizeSettings({ weightSource: "page" }).weightSource).toBe("page");
    expect(normalizeSettings({ weightSource: "custom" }).weightSource).toBe("custom");
    expect("weightSource" in normalizeSettings({ weightSource: "nope" })).toBe(false);
  });
});