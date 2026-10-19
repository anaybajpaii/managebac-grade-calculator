import { describe, expect, it } from "vitest";
import raw from "../../data/boundaries-m26.json";
import type { BoundariesFile } from "../engine/types";
import type { ScrapedTask } from "../page/types";
import { defaultSettings } from "../storage/settings";
import type { ClassSettings } from "../storage/types";
import { buildView } from "./view-model";

const boundaries = raw as unknown as BoundariesFile;

function task(category: string, score: number, max: number): ScrapedTask {
  return { title: "t", type: "Summative", category, labels: ["Summative", category], score, max };
}

const physicsInfo = { title: "Physics", level: "HL" as const };

const base = {
  ungraded: 0,
  info: physicsInfo,
  settings: defaultSettings(),
  boundaries,
  timezone: 1,
};

describe("buildView", () => {
  it("predicts a grade from graded tasks", () => {
    const view = buildView({ ...base, tasks: [task("Tests", 70, 100), task("Tests", 66, 100)] });
    expect(view.percent).toBeCloseTo(68);
    expect(view.grade).toBe(6);
    expect(view.next?.grade).toBe(7);
    expect(view.next?.needed).toBeCloseTo(5);
    expect(view.detail).toBe("HL · Timezone 1");
    expect(view.boundariesLabel).toBe("IB May 2026 boundaries");
    expect(view.note).toBeNull();
    expect(view.gradedCount).toBe(2);
  });

  it("puts a tick at each grade boundary", () => {
    const view = buildView({ ...base, tasks: [task("Tests", 50, 100)] });
    expect(view.ticks.map((t) => t.grade)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(view.ticks[5]?.at).toBe(73);
  });

  it("uses category weights when they are set", () => {
    const settings: ClassSettings = {
      version: 1,
      weightings: [
        { name: "Tests", weight: 75 },
        { name: "Assignment", weight: 25 },
      ],
      method: "average",
    };
    const view = buildView({
      ...base,
      settings,
      tasks: [task("Tests", 80, 100), task("Assignment", 40, 100)],
    });
    expect(view.percent).toBeCloseTo(70);
    expect(view.rows.map((r) => [r.name, r.weight, r.percent])).toEqual([
      ["Tests", 75, 80],
      ["Assignment", 25, 40],
    ]);
  });

  it("lists categories that have no weight yet", () => {
    const settings: ClassSettings = { version: 1, weightings: [{ name: "Tests", weight: 100 }], method: "average" };
    const view = buildView({ ...base, settings, tasks: [task("Tests", 5, 10), task("Homework", 9, 10)] });
    expect(view.unassigned).toEqual(["Homework"]);
  });

  it("explains when there are no graded tasks", () => {
    const view = buildView({ ...base, tasks: [], ungraded: 4 });
    expect(view.percent).toBeNull();
    expect(view.grade).toBeNull();
    expect(view.ticks).toEqual([]);
    expect(view.note).toBe("No graded tasks on this page yet.");
    expect(view.ungraded).toBe(4);
  });

  it("still shows a percentage when the subject cannot be matched", () => {
    const view = buildView({
      ...base,
      info: { title: "Theory of Knowledge", level: "HL" },
      tasks: [task("Tests", 60, 100)],
    });
    expect(view.percent).toBeCloseTo(60);
    expect(view.grade).toBeNull();
    expect(view.next).toBeNull();
    expect(view.note).toMatch(/could not match/i);
  });

  it("explains when the level cannot be read", () => {
    const view = buildView({ ...base, info: { title: "Physics", level: null }, tasks: [task("Tests", 60, 100)] });
    expect(view.grade).toBeNull();
    expect(view.note).toMatch(/level/i);
  });

  it("has no next grade at the top grade", () => {
    const view = buildView({ ...base, tasks: [task("Tests", 95, 100)] });
    expect(view.grade).toBe(7);
    expect(view.next).toBeNull();
  });

  it("omits the timezone for subjects that have none", () => {
    const single = boundaries.subjects.find((s) => s.timezone === 0 && s.level === "SL")!;
    const view = buildView({ ...base, info: { title: single.name, level: "SL" }, tasks: [task("Tests", 60, 100)] });
    expect(view.detail).toBe("SL");
  });

  
  it("uses the subject and level chosen in settings", () => {
    const view = buildView({
      ...base,
      info: { title: "Some odd class name", level: null },
      settings: { ...defaultSettings(), subjectName: "PHYSICS", level: "HL" },
      tasks: [task("Tests", 70, 100)],
    });
    expect(view.grade).toBe(6);
    expect(view.detail).toBe("HL · Timezone 1");
    expect(view.editor.subjectName).toBe("PHYSICS");
    expect(view.editor.level).toBe("HL");
  });

  it("predicts from own boundaries, even without a matched subject", () => {
    const settings: ClassSettings = { ...defaultSettings(), customStarts: [10, 25, 40, 55, 70, 85] };
    const view = buildView({
      ...base,
      info: { title: "Theory of Knowledge", level: "HL" },
      settings,
      tasks: [task("Tests", 72, 100)],
    });
    expect(view.grade).toBe(6);
    expect(view.next?.grade).toBe(7);
    expect(view.next?.needed).toBeCloseTo(13);
    expect(view.boundariesLabel).toBe("Your own boundaries");
    view.ticks.forEach((t, i) => expect(t.at).toBeCloseTo([10, 25, 40, 55, 70, 85][i] ?? -1));
    expect(view.note).toBeNull();
  });

  it("gives the editor what it needs", () => {
    const view = buildView({ ...base, tasks: [task("Tests", 70, 100), task("Quizzes", 5, 10)] });
    expect(view.editor.weightings).toEqual(base.settings.weightings);
    expect(view.editor.timezone).toBe(1);
    expect(view.editor.pageCategories).toEqual(["Tests", "Quizzes"]);
    expect(view.editor.officialStarts).toHaveLength(6);
    expect(view.editor.subjectNames).toContain("PHYSICS");
    expect(view.editor.customStarts).toBeNull();
  });

  it("points the user to settings when nothing matches", () => {
    const view = buildView({ ...base, info: { title: "Theory of Knowledge", level: "HL" }, tasks: [task("Tests", 60, 100)] });
    expect(view.note).toMatch(/settings/i);
  });

  it("uses the weights ManageBac shows when the class has none saved", () => {
    const view = buildView({
      ...base,
      pageWeights: [
        { name: "Tests", weight: 75 },
        { name: "Assignment", weight: 25 },
      ],
      tasks: [task("Tests", 80, 100), task("Assignment", 40, 100)],
    });
    expect(view.percent).toBeCloseTo(70);
    expect(view.weightsFromPage).toBe(true);
    expect(view.rows.map((r) => r.weight)).toEqual([75, 25]);
    expect(view.editor.usePageWeights).toBe(true);
    expect(view.editor.pageWeights).toHaveLength(2);
  });

  it("keeps the user's own weights when they chose them", () => {
    const settings: ClassSettings = {
      ...defaultSettings(),
      weightings: [{ name: "Tests", weight: 100 }],
    };
    const view = buildView({
      ...base,
      settings,
      pageWeights: [{ name: "Tests", weight: 10 }, { name: "Other", weight: 90 }],
      tasks: [task("Tests", 80, 100), task("Other", 0, 100)],
    });
    expect(view.percent).toBeCloseTo(80);
    expect(view.weightsFromPage).toBe(false);
    expect(view.editor.pageWeights).toHaveLength(2);
  });

  it("respects an explicit choice either way", () => {
    const pageWeights = [{ name: "Tests", weight: 100 }];
    const custom: ClassSettings = { ...defaultSettings(), weightSource: "custom" };
    expect(buildView({ ...base, settings: custom, pageWeights, tasks: [task("Tests", 50, 100)] }).weightsFromPage).toBe(false);
    const page: ClassSettings = {
      ...defaultSettings(),
      weightings: [{ name: "Mine", weight: 100 }],
      weightSource: "page",
    };
    expect(buildView({ ...base, settings: page, pageWeights, tasks: [task("Tests", 50, 100)] }).weightsFromPage).toBe(true);
  });

  it("falls back to saved weights when the page has none", () => {
    const view = buildView({ ...base, pageWeights: null, tasks: [task("Tests", 50, 100)] });
    expect(view.weightsFromPage).toBe(false);
    expect(view.editor.pageWeights).toBeNull();
  });
});