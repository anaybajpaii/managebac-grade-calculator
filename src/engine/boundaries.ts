import type { BoundariesFile, SubjectBounds } from "./types";

export function findSubject(
  file: BoundariesFile,
  name: string,
  level: "SL" | "HL",
  timezone: number,
): SubjectBounds | undefined {
  const wanted = name.trim().toLowerCase();
  return file.subjects.find(
    (s) => s.name.toLowerCase() === wanted && s.level === level && s.timezone === timezone,
  );
}