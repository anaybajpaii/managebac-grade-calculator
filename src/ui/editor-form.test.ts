import { describe, expect, it } from "vitest";
import { parseForm, prettySubject, type RawForm } from "./editor-form";

const good: RawForm = {
  weightings: [
    { name: " Summative ", weight: "70" },
    { name: "Formative", weight: "30" },
  ],
  usePage: false,
  method: "points",
  subjectName: "",
  level: "HL",
  timezone: "2",
  useCustom: false,
  starts: ["", "", "", "", "", ""],
};

function error(raw: RawForm): string {
  const result = parseForm(raw);
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("parseForm", () => {
  it("parses a valid form", () => {
    expect(parseForm(good)).toEqual({
      ok: true,
      value: {
        weightings: [
          { name: "Summative", weight: 70 },
          { name: "Formative", weight: 30 },
        ],
        weightSource: "custom",
        method: "points",
        subjectName: null,
        level: "HL",
        timezone: 2,
        customStarts: null,
      },
    });
  });

  it("accepts decimal commas and skips blank rows", () => {
    const result = parseForm({
      ...good,
      weightings: [{ name: "Tests", weight: "12,5" }, { name: "", weight: "" }],
    });
    expect(result.ok && result.value.weightings).toEqual([{ name: "Tests", weight: 12.5 }]);
  });

  it("falls back to sensible values for unknown dropdown values", () => {
    const result = parseForm({ ...good, method: "??", level: "??", subjectName: "  PHYSICS " });
    expect(result.ok && result.value).toMatchObject({ method: "average", level: null, subjectName: "PHYSICS" });
  });

  it("explains weighting problems", () => {
    expect(error({ ...good, weightings: [{ name: "", weight: "10" }] })).toMatch(/needs a name/);
    expect(error({ ...good, weightings: [{ name: "Tests", weight: "" }] })).toMatch(/"Tests"/);
    expect(error({ ...good, weightings: [{ name: "Tests", weight: "-5" }] })).toMatch(/"Tests"/);
    expect(error({ ...good, weightings: [] })).toMatch(/at least one category/i);
    expect(
      error({ ...good, weightings: [{ name: "A", weight: "1" }, { name: "a", weight: "2" }] }),
    ).toMatch(/twice/);
    expect(error({ ...good, weightings: [{ name: "A", weight: "0" }] })).toMatch(/above 0/);
  });

  it("rejects an unknown timezone", () => {
    expect(error({ ...good, timezone: "9" })).toMatch(/timezone/i);
  });

  it("validates own boundaries only when enabled", () => {
    expect(parseForm({ ...good, useCustom: false, starts: ["x", "", "", "", "", ""] }).ok).toBe(true);
    expect(error({ ...good, useCustom: true })).toMatch(/Grade 2 needs a number/);
    const result = parseForm({ ...good, useCustom: true, starts: ["10", "25", "40", "55", "70", "85"] });
    expect(result.ok && result.value.customStarts).toEqual([10, 25, 40, 55, 70, 85]);
  });
});

describe("weights from ManageBac", () => {
  it("does not insist on valid rows when the page's weights are used", () => {
    const result = parseForm({ ...good, usePage: true, weightings: [{ name: "", weight: "" }] });
    expect(result.ok && result.value.weightSource).toBe("page");
    expect(result.ok && result.value.weightings).toEqual([{ name: "All tasks", weight: 100 }]);
  });

  it("keeps the rows as a fallback copy", () => {
    const result = parseForm({ ...good, usePage: true });
    expect(result.ok && result.value.weightings).toEqual([
      { name: "Summative", weight: 70 },
      { name: "Formative", weight: 30 },
    ]);
  });
});

describe("prettySubject", () => {
  it("makes the PDF capitals readable", () => {
    expect(prettySubject("MATHEMATICS ANALYSIS AND APPROACHES")).toBe("Mathematics Analysis and Approaches");
    expect(prettySubject("PHYSICS")).toBe("Physics");
  });
});