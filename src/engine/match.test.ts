import { describe, expect, it } from "vitest";
import raw from "../../data/boundaries-m26.json";
import { pointsToNextGrade } from "./grade";
import { resolveSubject } from "./match";
import type { BoundariesFile } from "./types";

const data = raw as unknown as BoundariesFile;

describe("resolveSubject", () => {
  it("matches your core subjects by class title", () => {
    expect(resolveSubject(data, "Physics", "HL", 3)?.id).toBe("physics-hl-3");
    expect(resolveSubject(data, "Chemistry", "HL", 3)?.id).toBe("chemistry-hl-3");
    expect(resolveSubject(data, "Economics", "HL", 3)?.id).toBe("economics-hl-3");
    expect(resolveSubject(data, "Mathematics: Analysis and approaches", "HL", 3)?.id).toBe(
      "mathematics-analysis-and-approaches-hl-3",
    );
  });

  it("understands maths abbreviations", () => {
    const id = "mathematics-analysis-and-approaches-hl-3";
    for (const title of ["Math AA HL", "Maths AA", "Mathematics AA", "Mathematics: AA"]) {
      expect(resolveSubject(data, title, "HL", 3)?.id).toBe(id);
    }
    expect(resolveSubject(data, "Maths AI", "SL", 3)?.id).toContain("applications");
  });

  it("ignores case, punctuation and extra words in the title", () => {
    expect(resolveSubject(data, "  PHYSICS (DP1 - 2026) ", "HL", 1)?.id).toBe("physics-hl-1");
    expect(resolveSubject(data, "Mathematics & Analysis & Approaches", "HL", 2)?.id).toBe(
      "mathematics-analysis-and-approaches-hl-2",
    );
  });

  it("matches abbreviated names in the boundaries by prefix", () => {
    expect(resolveSubject(data, "Computer Science", "HL", 1)?.id).toBe("computer-sc-hl-1");
    expect(resolveSubject(data, "Mathematics: Applications and interpretation", "SL", 2)?.id).toBe(
      "mathematics-applications-and-interp-sl-2",
    );
  });

  it("respects the level", () => {
    expect(resolveSubject(data, "Physics", "SL", 3)?.id).toBe("physics-sl-3");
  });

  it("picks the most specific subject name", () => {
    const result = resolveSubject(data, "Mathematics: Analysis and approaches", "HL", 3);
    expect(result?.name).toBe("MATHEMATICS ANALYSIS AND APPROACHES");
  });

  it("uses the preferred timezone, then timezone 0, then the lowest available", () => {
    expect(resolveSubject(data, "Physics", "HL", 2)?.timezone).toBe(2);
    const single = data.subjects.find((s) => s.timezone === 0 && s.level === "SL")!;
    expect(resolveSubject(data, single.name, "SL", 3)?.timezone).toBe(0);
    expect(resolveSubject(data, "Physics", "HL", 9)?.timezone).toBe(1);
  });

  it("returns undefined when nothing matches", () => {
    expect(resolveSubject(data, "", "HL", 3)).toBeUndefined();
    expect(resolveSubject(data, "Theory of Knowledge", "HL", 3)).toBeUndefined();
  });
});

describe("pointsToNextGrade", () => {
  const overall = resolveSubject(data, "Physics", "HL", 1)!.overall;

  it("reports the gap to the next boundary", () => {
    expect(pointsToNextGrade(overall, 68.4)?.grade).toBe(7);
    expect(pointsToNextGrade(overall, 68.4)?.needed).toBeCloseTo(4.6);
    expect(pointsToNextGrade(overall, 20)).toEqual({ grade: 3, needed: 6 });
  });

  it("returns null at the top grade", () => {
    expect(pointsToNextGrade(overall, 80)).toBeNull();
  });

  it("never reports a negative gap", () => {
    expect(pointsToNextGrade(overall, 73)?.needed).toBeUndefined();
    expect(pointsToNextGrade(overall, 72.9)?.needed).toBeGreaterThanOrEqual(0);
  });
});