import { gradeForMark, weightedPercent } from "./grade";
import type { BandSet, Category, CategoryMethod } from "./types";

export interface WhatIfModel {
  categories: Category[];
  method: CategoryMethod;
  overall: BandSet;
}

function withTask(model: WhatIfModel, category: string, score: number, max: number): Category[] | null {
  const wanted = category.trim().toLowerCase();
  const index = model.categories.findIndex((c) => c.name.trim().toLowerCase() === wanted);
  const target = model.categories[index];
  if (!target || !(target.weight > 0)) return null;
  return model.categories.map((c, i) => (i === index ? { ...c, tasks: [...c.tasks, { score, max }] } : c));
}

/** The overall percentage and grade if one more task with this score is added to a category. */
export function predictWith(
  model: WhatIfModel,
  category: string,
  score: number,
  max: number,
): { percent: number; grade: number } | null {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || score < 0) return null;
  const categories = withTask(model, category, score, max);
  if (!categories) return null;
  const percent = weightedPercent(categories, model.method);
  if (percent === null) return null;
  return { percent, grade: gradeForMark(model.overall.bands, percent) };
}

export type ScoreNeeded =
  | { kind: "needed"; score: number }
  | { kind: "any" }
  | { kind: "unreachable"; bestGrade: number }
  | { kind: "noweight" };

/** The lowest score on one more task in a category that reaches a target grade. */
export function scoreNeeded(model: WhatIfModel, category: string, max: number, targetGrade: number): ScoreNeeded | null {
  const band = model.overall.bands[targetGrade - 1];
  if (!band || !Number.isFinite(max) || max <= 0) return null;
  const target = band[0];
  const at = (score: number): number | null => predictWith(model, category, score, max)?.percent ?? null;

  const worst = at(0);
  const best = at(max);
  if (worst === null || best === null) return { kind: "noweight" };
  if (worst >= target) return { kind: "any" };
  if (best < target) return { kind: "unreachable", bestGrade: gradeForMark(model.overall.bands, best) };

  let low = 0;
  let high = max;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if ((at(mid) ?? 0) >= target) high = mid;
    else low = mid;
  }
  // Round up to one decimal so the shown score really reaches the target.
  let score = Math.min(max, Math.ceil(high * 10 - 1e-9) / 10);
  if ((at(score) ?? 0) < target) score = Math.min(max, score + 0.1);
  return { kind: "needed", score };
}
