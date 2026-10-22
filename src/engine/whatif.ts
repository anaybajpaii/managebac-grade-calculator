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

export interface PlannedTask {
  category: string;
  max: number;
  /** null: not known yet, so work out what it needs to be. */
  score: number | null;
}

function validTask(model: WhatIfModel, t: { category: string; score: number; max: number }): boolean {
  const wanted = t.category.trim().toLowerCase();
  const category = model.categories.find((c) => c.name.trim().toLowerCase() === wanted);
  return (
    category !== undefined &&
    category.weight > 0 &&
    Number.isFinite(t.score) &&
    Number.isFinite(t.max) &&
    t.max > 0 &&
    t.score >= 0
  );
}

/** The overall percentage and grade if several more tasks are added. */
export function predictWithTasks(
  model: WhatIfModel,
  tasks: { category: string; score: number; max: number }[],
): { percent: number; grade: number } | null {
  if (tasks.length === 0 || !tasks.every((t) => validTask(model, t))) return null;
  let categories = model.categories;
  for (const t of tasks) {
    const wanted = t.category.trim().toLowerCase();
    categories = categories.map((c) =>
      c.name.trim().toLowerCase() === wanted ? { ...c, tasks: [...c.tasks, { score: t.score, max: t.max }] } : c,
    );
  }
  const percent = weightedPercent(categories, model.method);
  if (percent === null) return null;
  return { percent, grade: gradeForMark(model.overall.bands, percent) };
}

export type PercentNeeded =
  | { kind: "needed"; percent: number; scores: number[] }
  | { kind: "any" }
  | { kind: "unreachable"; bestGrade: number }
  | { kind: "noweight" };

/**
 * The same percentage on every task with no score yet that reaches a target grade, given the
 * tasks that already have a score. `scores` lines up with the tasks that had no score.
 */
export function percentNeeded(model: WhatIfModel, planned: PlannedTask[], targetGrade: number): PercentNeeded | null {
  const band = model.overall.bands[targetGrade - 1];
  const unknown = planned.filter((t) => t.score === null);
  if (!band || unknown.length === 0) return null;
  if (unknown.some((t) => !Number.isFinite(t.max) || t.max <= 0)) return null;
  const fixed = planned.flatMap((t) => (t.score === null ? [] : [{ category: t.category, max: t.max, score: t.score }]));
  const target = band[0];

  const at = (fraction: number): number | null =>
    predictWithTasks(model, [
      ...fixed,
      ...unknown.map((t) => ({ category: t.category, max: t.max, score: t.max * fraction })),
    ])?.percent ?? null;

  const worst = at(0);
  const best = at(1);
  if (worst === null || best === null) return { kind: "noweight" };
  if (worst >= target) return { kind: "any" };
  if (best < target) return { kind: "unreachable", bestGrade: gradeForMark(model.overall.bands, best) };

  let low = 0;
  let high = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if ((at(mid) ?? 0) >= target) high = mid;
    else low = mid;
  }
  // Round up to a tenth of a percent so the shown numbers really reach the target.
  let fraction = Math.min(1, Math.ceil(high * 1000 - 1e-9) / 1000);
  while (fraction < 1 && (at(fraction) ?? 0) < target) fraction = Math.min(1, fraction + 0.001);
  return {
    kind: "needed",
    percent: fraction * 100,
    scores: unknown.map((t) => Math.round(t.max * fraction * 10) / 10),
  };
}
