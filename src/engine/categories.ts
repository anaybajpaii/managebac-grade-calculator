import type { Category } from "./types";

export const CATCH_ALL = "All tasks";

export interface CategorizedTask {
  category: string;
  score: number;
  max: number;
}

export interface WeightingInput {
  name: string;
  weight: number;
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function uniqueCategories(tasks: { category: string }[]): string[] {
  const result: string[] = [];
  for (const task of tasks) {
    if (!result.some((name) => same(name, task.category))) result.push(task.category);
  }
  return result;
}

export function buildCategories(
  tasks: CategorizedTask[],
  weightings: WeightingInput[],
): { categories: Category[]; unassigned: string[] } {
  const only = weightings.length === 1 ? weightings[0] : undefined;
  if (only && same(only.name, CATCH_ALL)) {
    return {
      categories: [
        { name: only.name, weight: only.weight, tasks: tasks.map((t) => ({ score: t.score, max: t.max })) },
      ],
      unassigned: [],
    };
  }
  const categories = weightings.map((w) => ({
    name: w.name,
    weight: w.weight,
    tasks: tasks.filter((t) => same(t.category, w.name)).map((t) => ({ score: t.score, max: t.max })),
  }));
  const unassigned = uniqueCategories(tasks).filter((name) => !weightings.some((w) => same(w.name, name)));
  return { categories, unassigned };
}
