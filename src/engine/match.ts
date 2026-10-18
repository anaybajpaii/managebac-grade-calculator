import type { BoundariesFile, SubjectBounds } from "./types";

const STOP_WORDS = new Set(["a", "an", "and", "the", "of", "in", "for", "to"]);

const ALIASES: Record<string, string[]> = {
  math: ["mathematics"],
  maths: ["mathematics"],
  aa: ["analysis", "approaches"],
  ai: ["applications", "interp"],
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t !== "" && !STOP_WORDS.has(t))
    .flatMap((t) => ALIASES[t] ?? [t]);
}
function nameMatches(nameTokens: string[], titleTokens: string[]): boolean {
  return nameTokens.length > 0 && nameTokens.every((n) => titleTokens.some((t) => t.startsWith(n)));
}

export function resolveSubject(
  file: BoundariesFile,
  title: string,
  level: "SL" | "HL",
  preferredTimezone: number,
): SubjectBounds | undefined {
  const titleTokens = tokens(title);
  const candidates = file.subjects.filter(
    (s) => s.level === level && nameMatches(tokens(s.name), titleTokens),
  );
  if (candidates.length === 0) return undefined;
  const best = Math.max(...candidates.map((s) => tokens(s.name).length));
  const specific = candidates.filter((s) => tokens(s.name).length === best);
  const names = [...new Set(specific.map((s) => s.name))];
  const chosen = specific.filter((s) => s.name === names[0]);
  return (
    chosen.find((s) => s.timezone === preferredTimezone) ??
    chosen.find((s) => s.timezone === 0) ??
    [...chosen].sort((a, b) => a.timezone - b.timezone)[0]
  );
}