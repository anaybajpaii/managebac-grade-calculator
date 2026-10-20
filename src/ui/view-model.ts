import { DEFAULT_APPEARANCE, type Appearance } from "../appearance";
import { buildCategories, CATCH_ALL, uniqueCategories } from "../engine/categories";
import { boundsFromStarts, startsFromBands } from "../engine/custom-bounds";
import { categoryPercent, pointsToNextGrade, predictGrade, weightedPercent } from "../engine/grade";
import { resolveSubject } from "../engine/match";
import type { WhatIfModel } from "../engine/whatif";
import type { BoundariesFile, CategoryMethod } from "../engine/types";
import type { ClassInfo, PageWeight, ScrapedTask } from "../page/types";
import type { ClassSettings, Weighting } from "../storage/types";

export interface CategoryRow {
  name: string;
  weight: number;
  percent: number | null;
  taskCount: number;
}

export interface EditorModel {
  weightings: Weighting[];
  /** Weights ManageBac shows for this class, if the page has them. */
  pageWeights: PageWeight[] | null;
  usePageWeights: boolean;
  /** Extra categories counted on top of the page's weights. */
  extraWeightings: Weighting[];
  method: CategoryMethod;
  subjectName: string | null;
  level: "SL" | "HL" | null;
  timezone: number;
  customStarts: number[] | null;
  /** Official grade 2 to 7 starts for the matched subject, used to prefill custom boundaries. */
  officialStarts: number[] | null;
  subjectNames: string[];
  pageCategories: string[];
}

export interface OverlayView {
  title: string | null;
  detail: string | null;
  boundariesLabel: string;
  percent: number | null;
  grade: number | null;
  next: { grade: number; needed: number } | null;
  ticks: { grade: number; at: number }[];
  rows: CategoryRow[];
  gradedCount: number;
  ungraded: number;
  unassigned: string[];
  note: string | null;
  weightsFromPage: boolean;
  /** Everything the what-if section needs; null when no grade can be predicted. */
  whatIf: WhatIfModel | null;
  appearance: Appearance;
  editor: EditorModel;
}

export interface ViewInput {
  tasks: ScrapedTask[];
  ungraded: number;
  info: ClassInfo;
  settings: ClassSettings;
  boundaries: BoundariesFile;
  timezone: number;
  pageWeights?: PageWeight[] | null;
  appearance?: Appearance;
}

function isDefaultWeightings(weightings: Weighting[]): boolean {
  const only = weightings[0];
  return weightings.length === 1 && only !== undefined && only.name.trim().toLowerCase() === CATCH_ALL.toLowerCase();
}

export function buildView(input: ViewInput): OverlayView {
  const { tasks, ungraded, info, settings, boundaries, timezone } = input;
  const pageWeights = input.pageWeights && input.pageWeights.length > 0 ? input.pageWeights : null;
  const source = settings.weightSource ?? (isDefaultWeightings(settings.weightings) ? "page" : "custom");
  const usePageWeights = source === "page" && pageWeights !== null;
  const extras = usePageWeights ? (settings.extraWeightings ?? []) : [];
  const pageNames = new Set((pageWeights ?? []).map((w) => w.name.trim().toLowerCase()));
  const weightings: Weighting[] = usePageWeights
    ? [...(pageWeights ?? []), ...extras.filter((w) => !pageNames.has(w.name.trim().toLowerCase()))]
    : settings.weightings;
  const name = settings.subjectName ?? info.title;
  const level = settings.level ?? info.level;
  const subject = level ? resolveSubject(boundaries, name, level, timezone) : undefined;
  const custom = settings.customStarts ? boundsFromStarts(settings.customStarts) : null;
  const overall = custom ?? subject?.overall ?? null;
  const { categories, unassigned } = buildCategories(tasks, weightings);
  const percent = weightedPercent(categories, settings.method);

  const rows = categories.map((c) => ({
    name: c.name,
    weight: c.weight,
    percent: categoryPercent(c.tasks, settings.method),
    taskCount: c.tasks.length,
  }));

  let grade: number | null = null;
  let next: OverlayView["next"] = null;
  let ticks: OverlayView["ticks"] = [];
  let note: string | null = null;

  if (overall && percent !== null) {
    grade = predictGrade(percent, overall);
    next = pointsToNextGrade(overall, percent);
    ticks = overall.bands.slice(1).map((band, i) => ({
      grade: i + 2,
      at: (band[0] / overall.max) * 100,
    }));
  }

  if (!overall) {
    note = !level
      ? "Could not read the level (SL or HL) from this page. Choose it in settings."
      : "Could not match this class to an IB subject, so no grade is predicted. Choose one in settings, or set your own boundaries.";
  } else if (percent === null) {
    note = "No graded tasks on this page yet.";
  }

  const detail = subject
    ? subject.timezone === 0
      ? subject.level
      : `${subject.level} · Timezone ${subject.timezone}`
    : level;

  return {
    title: info.title || null,
    detail,
    boundariesLabel: custom ? "Your own boundaries" : `IB ${boundaries.label} boundaries`,
    percent,
    grade,
    next,
    ticks,
    rows,
    gradedCount: tasks.length,
    ungraded,
    unassigned,
    note,
    weightsFromPage: usePageWeights,
    whatIf:
      overall && categories.some((c) => c.weight > 0)
        ? { categories: categories.map((c) => ({ ...c, tasks: c.tasks.map((t) => ({ ...t })) })), method: settings.method, overall }
        : null,
    appearance: input.appearance ?? DEFAULT_APPEARANCE,
    editor: {
      weightings: (usePageWeights ? (pageWeights ?? []) : settings.weightings).map((w) => ({ ...w })),
      pageWeights: pageWeights ? pageWeights.map((w) => ({ ...w })) : null,
      usePageWeights,
      extraWeightings: (settings.extraWeightings ?? []).map((w) => ({ ...w })),
      method: settings.method,
      subjectName: settings.subjectName ?? null,
      level: settings.level ?? null,
      timezone,
      customStarts: settings.customStarts ? [...settings.customStarts] : null,
      officialStarts: subject ? startsFromBands(subject.overall) : null,
      subjectNames: [...new Set(boundaries.subjects.map((s) => s.name))].sort(),
      pageCategories: uniqueCategories(tasks),
    },
  };
}
