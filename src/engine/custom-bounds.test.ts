import { describe, expect, it } from "vitest";
import { boundsFromStarts, startsFromBands, validateStarts } from "./custom-bounds";
import { gradeForMark } from "./grade";

describe("custom boundaries", () => {
  const starts = [10, 25, 40, 55, 70, 85];

  it("turns grade 2 to 7 starts into bands", () => {
    const bounds = boundsFromStarts(starts);
    expect(bounds.max).toBe(100);
    expect(bounds.bands.map((b) => b[0])).toEqual([0, 10, 25, 40, 55, 70, 85]);
    expect(gradeForMark(bounds.bands, 9.9)).toBe(1);
    expect(gradeForMark(bounds.bands, 10)).toBe(2);
    expect(gradeForMark(bounds.bands, 84.9)).toBe(6);
    expect(gradeForMark(bounds.bands, 100)).toBe(7);
  });

  it("reads starts back from bands", () => {
    expect(startsFromBands(boundsFromStarts(starts))).toEqual(starts);
    expect(startsFromBands({ max: 200, bands: [[0, 0], [29, 0], [57, 0]] })).toEqual([14.5, 28.5]);
  });

  it("accepts valid starts", () => {
    expect(validateStarts(starts)).toBeNull();
    expect(validateStarts([1, 2, 3, 4, 5, 100])).toBeNull();
  });

  it("rejects bad starts with a reason", () => {
    expect(validateStarts([10, 25])).toMatch(/grades 2 to 7/);
    expect(validateStarts([0, 25, 40, 55, 70, 85])).toMatch(/above 0/);
    expect(validateStarts([10, 25, 25, 55, 70, 85])).toMatch(/Grade 4 must start above grade 3/);
    expect(validateStarts([10, 25, 40, 55, 70, 101])).toMatch(/above 100/);
    expect(validateStarts([10, 25, Number.NaN, 55, 70, 85])).toMatch(/Grade 4 needs a number/);
  });
});
