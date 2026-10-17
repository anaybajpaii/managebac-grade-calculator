import { describe, expect, it } from "vitest";
import { buildCategories, CATCH_ALL, uniqueCategories } from "./categories";
import { weightedPercent } from "./grade";

const tasks = [
  { category: "Tests", score: 18, max: 20 },
  { category: "Assignment", score: 7, max: 10 },
  { category: "tests", score: 40, max: 50 },
  { category: "Homework", score: 9, max: 10 },
];

describe("uniqueCategories", () => {
  it("keeps first-seen order and ignores case", () => {
    expect(uniqueCategories(tasks)).toEqual(["Tests", "Assignment", "Homework"]);
    expect(uniqueCategories([])).toEqual([]);
  });
});

describe("buildCategories", () => {
  it("puts every task in one category for the default catch-all weighting", () => {
    const { categories, unassigned } = buildCategories(tasks, [{ name: CATCH_ALL, weight: 100 }]);
    expect(categories).toHaveLength(1);
    expect(categories[0]!.tasks).toHaveLength(4);
    expect(unassigned).toEqual([]);
  });

  it("matches categories to weightings case-insensitively", () => {
    const { categories } = buildCategories(tasks, [
      { name: "TESTS", weight: 70 },
      { name: "Assignment", weight: 30 },
      { name: "Homework", weight: 0 },
    ]);
    expect(categories.map((c) => [c.name, c.weight, c.tasks.length])).toEqual([
      ["TESTS", 70, 2],
      ["Assignment", 30, 1],
      ["Homework", 0, 1],
    ]);
  });

  it("reports page categories that have no weighting", () => {
    const { categories, unassigned } = buildCategories(tasks, [{ name: "Tests", weight: 100 }]);
    expect(categories).toHaveLength(1);
    expect(unassigned).toEqual(["Assignment", "Homework"]);
  });

  it("keeps weighted categories that have no tasks yet", () => {
    const { categories } = buildCategories(tasks, [
      { name: "Tests", weight: 50 },
      { name: "Papers", weight: 50 },
    ]);
    expect(categories[1]).toEqual({ name: "Papers", weight: 50, tasks: [] });
  });

  it("feeds the engine to give a weighted percentage", () => {
    const { categories } = buildCategories(tasks, [
      { name: "Tests", weight: 60 },
      { name: "Assignment", weight: 40 },
    ]);
    expect(weightedPercent(categories)).toBeCloseTo(0.6 * 85 + 0.4 * 70);
    expect(weightedPercent(categories, "points")).toBeCloseTo(0.6 * (58 / 70) * 100 + 0.4 * 70);
  });
});