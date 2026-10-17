import type { Band, BandSet, Category, CategoryMethod, Task } from "./types";

export function gradeForMark(bands: Band[], mark: number): number {
  if (!Number.isFinite(mark)) {
    throw new RangeError(`mark must be a finite number, got ${mark}`);
  }
  let grade = 1;
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (band && mark >= band[0]) grade = i + 1;
  }
  return grade;
}

export function predictGrade(percent: number, overall: BandSet): number {
  return gradeForMark(overall.bands, percent);
}

function isGraded(task: Task): boolean {
  return Number.isFinite(task.score) && Number.isFinite(task.max) && task.max > 0;
}

export function categoryPercent(tasks: Task[], method: CategoryMethod = "average"): number | null {
  const graded = tasks.filter(isGraded);
  if (graded.length === 0) return null;
  if (method === "points") {
    const score = graded.reduce((sum, t) => sum + t.score, 0);
    const max = graded.reduce((sum, t) => sum + t.max, 0);
    return (score / max) * 100;
  }
  const total = graded.reduce((sum, t) => sum + (t.score / t.max) * 100, 0);
  return total / graded.length;
}

export function weightedPercent(
  categories: Category[],
  method: CategoryMethod = "average",
): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const category of categories) {
    if (!(category.weight > 0)) continue;
    const percent = categoryPercent(category.tasks, method);
    if (percent === null) continue;
    weighted += percent * category.weight;
    totalWeight += category.weight;
  }
  if (totalWeight === 0) return null;
  return weighted / totalWeight;
}