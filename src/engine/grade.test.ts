import { describe, expect, it } from "vitest";
import raw from "../../data/boundaries-m26.json";
import { findSubject } from "./boundaries";
import { categoryPercent, gradeForMark, predictGrade, weightedPercent } from "./grade";
import type { BoundariesFile } from "./types";

const data = raw as unknown as BoundariesFile;

const physics = findSubject(data, "PHYSICS", "HL", 1);
const compSci = findSubject(data, "COMPUTER SC.", "HL", 1);

describe("gradeForMark", () => {
  const bands = physics!.overall.bands;

  it("maps marks on and around each boundary", () => {
    expect(gradeForMark(bands, 0)).toBe(1);
    expect(gradeForMark(bands, 15)).toBe(1);
    expect(gradeForMark(bands, 16)).toBe(2);
    expect(gradeForMark(bands, 72)).toBe(6);
    expect(gradeForMark(bands, 73)).toBe(7);
    expect(gradeForMark(bands, 100)).toBe(7);
  });

  it("keeps fractional marks below a boundary in the lower grade", () => {
    expect(gradeForMark(bands, 15.9)).toBe(1);
    expect(gradeForMark(bands, 72.99)).toBe(6);
  });

  it("clamps out-of-range marks", () => {
    expect(gradeForMark(bands, -5)).toBe(1);
    expect(gradeForMark(bands, 250)).toBe(7);
  });

  it("rejects non-finite marks", () => {
    expect(() => gradeForMark(bands, NaN)).toThrow(RangeError);
    expect(() => gradeForMark(bands, Infinity)).toThrow(RangeError);
  });

  it("resolves gaps and overlaps printed in the IB source", () => {
    const paperTwo = compSci!.components.find((c) => c.name === "PAPER TWO")!;
    expect(paperTwo.bands[0]).toEqual([0, 9]);
    expect(paperTwo.bands[1]).toEqual([11, 20]);
    expect(paperTwo.bands[2]).toEqual([20, 29]);
    expect(gradeForMark(paperTwo.bands, 10)).toBe(1);
    expect(gradeForMark(paperTwo.bands, 11)).toBe(2);
    expect(gradeForMark(paperTwo.bands, 20)).toBe(3);
  });
});

describe("categoryPercent", () => {
  const tasks = [
    { score: 5, max: 10 },
    { score: 90, max: 100 },
  ];

  it("averages task percentages by default", () => {
    expect(categoryPercent(tasks)).toBeCloseTo(70);
  });

  it("can use total points instead", () => {
    expect(categoryPercent(tasks, "points")).toBeCloseTo((95 / 110) * 100);
  });

  it("ignores ungraded tasks and returns null when none are graded", () => {
    expect(categoryPercent([{ score: NaN, max: 10 }, { score: 4, max: 0 }])).toBeNull();
    expect(categoryPercent([])).toBeNull();
    expect(categoryPercent([{ score: NaN, max: 10 }, { score: 8, max: 10 }])).toBeCloseTo(80);
  });

  it("counts a zero score as graded", () => {
    expect(categoryPercent([{ score: 0, max: 10 }])).toBe(0);
  });
});

describe("weightedPercent", () => {
  it("applies category weights", () => {
    const result = weightedPercent([
      { name: "Exams", weight: 70, tasks: [{ score: 80, max: 100 }] },
      { name: "Homework", weight: 30, tasks: [{ score: 50, max: 100 }] },
    ]);
    expect(result).toBeCloseTo(71);
  });

  it("renormalises over categories that have graded work", () => {
    const result = weightedPercent([
      { name: "Exams", weight: 70, tasks: [{ score: 80, max: 100 }] },
      { name: "Homework", weight: 30, tasks: [] },
    ]);
    expect(result).toBeCloseTo(80);
  });

  it("skips zero-weight categories and returns null with nothing to weigh", () => {
    expect(weightedPercent([{ name: "Optional", weight: 0, tasks: [{ score: 1, max: 2 }] }])).toBeNull();
    expect(weightedPercent([])).toBeNull();
  });
});

describe("predictGrade", () => {
  it("turns a weighted percentage into an IB grade using OVERALL bands", () => {
    const percent = weightedPercent([
      { name: "Exams", weight: 100, tasks: [{ score: 74, max: 100 }] },
    ]);
    expect(predictGrade(percent!, physics!.overall)).toBe(7);
    expect(predictGrade(60, physics!.overall)).toBe(5);
  });
});

describe("findSubject", () => {
  it("matches name case-insensitively", () => {
    expect(findSubject(data, "physics", "HL", 1)?.id).toBe("physics-hl-1");
  });

  it("returns undefined for an unknown combination", () => {
    expect(findSubject(data, "PHYSICS", "HL", 9)).toBeUndefined();
    expect(findSubject(data, "NOT A SUBJECT", "SL", 0)).toBeUndefined();
  });
});

describe("boundaries data", () => {
  it("has 7 bands starting at 0 for every OVERALL row", () => {
    expect(data.subjects.length).toBeGreaterThan(0);
    for (const s of data.subjects) {
      expect(s.overall.bands).toHaveLength(7);
      expect(s.overall.bands[0]![0]).toBe(0);
    }
  });
});
