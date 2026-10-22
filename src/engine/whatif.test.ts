import { describe, expect, it } from "vitest";
import { weightedPercent } from "./grade";
import { percentNeeded, predictWith, predictWithTasks, scoreNeeded, type WhatIfModel } from "./whatif";

// Grade 2 from 10, then 25, 40, 55, 70, 85.
const overall = {
  max: 100,
  bands: [[0, 9], [10, 24], [25, 39], [40, 54], [55, 69], [70, 84], [85, 100]] as [number, number][],
};

function model(overrides: Partial<WhatIfModel> = {}): WhatIfModel {
  return {
    method: "average",
    overall,
    categories: [
      { name: "Tests", weight: 60, tasks: [{ score: 60, max: 100 }] },
      { name: "Homework", weight: 40, tasks: [{ score: 100, max: 100 }] },
      { name: "Ignored", weight: 0, tasks: [] },
    ],
    ...overrides,
  };
}

describe("predictWith", () => {
  it("adds a hypothetical task to one category", () => {
    // Tests: average of 60 and 100 = 80. Homework stays 100. Overall 0.6 * 80 + 0.4 * 100 = 88.
    const result = predictWith(model(), "Tests", 100, 100);
    expect(result?.percent).toBeCloseTo(88);
    expect(result?.grade).toBe(7);
  });

  it("matches the category name loosely and does not change the model", () => {
    const m = model();
    const before = JSON.stringify(m);
    expect(predictWith(m, "  tests ", 0, 100)?.percent).toBeCloseTo(0.6 * 30 + 0.4 * 100);
    expect(JSON.stringify(m)).toBe(before);
  });

  it("works for a category with no tasks yet", () => {
    const m = model({ categories: [{ name: "Tests", weight: 50, tasks: [] }, { name: "HW", weight: 50, tasks: [{ score: 50, max: 100 }] }] });
    expect(predictWith(m, "Tests", 90, 100)?.percent).toBeCloseTo(70);
  });

  it("handles points-based categories", () => {
    const m = model({ method: "points", categories: [{ name: "Tests", weight: 100, tasks: [{ score: 10, max: 10 }] }] });
    expect(predictWith(m, "Tests", 0, 90)?.percent).toBeCloseTo(10);
  });

  it("returns null for bad input or a zero-weight category", () => {
    expect(predictWith(model(), "Tests", Number.NaN, 100)).toBeNull();
    expect(predictWith(model(), "Tests", 5, 0)).toBeNull();
    expect(predictWith(model(), "Tests", -1, 10)).toBeNull();
    expect(predictWith(model(), "Ignored", 5, 10)).toBeNull();
    expect(predictWith(model(), "Nope", 5, 10)).toBeNull();
  });
});

describe("scoreNeeded", () => {
  it("finds the lowest score that reaches the target", () => {
    const m = model();
    const result = scoreNeeded(m, "Tests", 100, 7);
    expect(result).toEqual({ kind: "needed", score: 90 });
    // The shown score reaches 85, and a tenth lower does not.
    expect(predictWith(m, "Tests", 90, 100)?.percent).toBeGreaterThanOrEqual(85);
    expect(predictWith(m, "Tests", 89.9, 100)?.percent).toBeLessThan(85);
    expect(scoreNeeded(m, "Tests", 100, 6)).toEqual({ kind: "needed", score: 40 });
  });

  it("says any score works when the target is already safe", () => {
    // Even a zero leaves the overall at 58, which is above the grade 5 boundary of 55.
    expect(scoreNeeded(model(), "Tests", 100, 5)).toEqual({ kind: "any" });
  });

  it("says when even full marks are not enough", () => {
    const m = model({ categories: [{ name: "Tests", weight: 10, tasks: [{ score: 0, max: 100 }] }, { name: "HW", weight: 90, tasks: [{ score: 0, max: 100 }] }] });
    expect(scoreNeeded(m, "Tests", 100, 7)).toEqual({ kind: "unreachable", bestGrade: expect.any(Number) });
    const result = scoreNeeded(m, "Tests", 100, 7);
    expect(result?.kind === "unreachable" && result.bestGrade).toBeLessThan(7);
  });

  it("reports a category without weight", () => {
    expect(scoreNeeded(model(), "Ignored", 100, 7)).toEqual({ kind: "noweight" });
  });

  it("returns null for an impossible target or max", () => {
    expect(scoreNeeded(model(), "Tests", 100, 9)).toBeNull();
    expect(scoreNeeded(model(), "Tests", 0, 7)).toBeNull();
  });

  it("agrees with the real calculation", () => {
    const m = model();
    const result = scoreNeeded(m, "Tests", 50, 7);
    if (result?.kind !== "needed") throw new Error("expected a needed score");
    const categories = m.categories.map((c) =>
      c.name === "Tests" ? { ...c, tasks: [...c.tasks, { score: result.score, max: 50 }] } : c,
    );
    expect(weightedPercent(categories, "average")).toBeGreaterThanOrEqual(85);
  });
});

describe("multiple planned tasks", () => {
  const model: WhatIfModel = {
    method: "average",
    overall: { max: 100, bands: [[0, 9], [10, 24], [25, 39], [40, 54], [55, 69], [70, 84], [85, 100]] },
    categories: [
      { name: "Tests", weight: 70, tasks: [{ score: 60, max: 100 }] },
      { name: "Homework", weight: 30, tasks: [] },
    ],
  };

  it("combines tasks across categories", () => {
    const r = predictWithTasks(model, [
      { category: "Tests", score: 100, max: 100 },
      { category: "Homework", score: 100, max: 100 },
    ]);
    expect(r?.percent).toBeCloseTo(0.7 * 80 + 0.3 * 100, 5);
    expect(r?.grade).toBe(7);
  });

  it("rejects unknown categories", () => {
    expect(predictWithTasks(model, [{ category: "Nope", score: 1, max: 2 }])).toBeNull();
  });

  it("works out the score several unknown tasks need", () => {
    const need = percentNeeded(
      model,
      [
        { category: "Tests", max: 100, score: null },
        { category: "Tests", max: 100, score: null },
      ],
      6,
    );
    expect(need?.kind).toBe("needed");
    if (need?.kind === "needed") expect(need.percent).toBeGreaterThan(70);
  });

  it("reports unreachable targets", () => {
    const need = percentNeeded(model, [{ category: "Tests", max: 100, score: null }], 7);
    expect(need).toEqual({ kind: "unreachable", bestGrade: 6 });
  });
});
