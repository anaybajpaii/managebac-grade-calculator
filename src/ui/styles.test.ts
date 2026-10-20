import { describe, expect, it } from "vitest";
import { MODES, TONES } from "../appearance";
import { STYLES } from "./styles";

describe("styles", () => {
  it("has a rule for every tone", () => {
    for (const tone of TONES) expect(STYLES).toContain(`.root[data-tone="${tone.id}"]`);
  });

  it("has dark rules for the dark and system modes", () => {
    expect(STYLES).toContain('.root[data-mode="dark"]');
    expect(STYLES).toMatch(/@media \(prefers-color-scheme: dark\) \{ \.root\[data-mode="auto"\]/);
    expect(MODES.map((m) => m.id)).toEqual(["light", "dark", "auto"]);
  });

  it("keeps black and white as the default", () => {
    expect(STYLES).toMatch(/\.root \{\s*--bg: #ffffff; --ink: #111111;/);
  });

  it("defines the dark accent for every tone", () => {
    expect(STYLES.match(/--t-accent-dark:/g)?.length).toBe(TONES.length + 1);
  });
});
