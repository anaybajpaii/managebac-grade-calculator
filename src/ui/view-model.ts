import { buildCategories } from "../engine/categories";
import { categoryPercent, pointsToNextGrade, predictGrade, weightedPercent } from "../engine/grade";
import { resolveSubject } from "../engine/match";
import type { BoundariesFile } from "../engine/types";
import type { ClassInfo, ScrapedTask } from "../page/types";
import type { ClassSettings } from "../storage/types";

export interface CategoryRow {
  name: string;
  weight: number;
  percent: number | null;
  taskCount: number;
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
}

export interface ViewInput {
  tasks: ScrapedTask[];
  ungraded: number;
  info: ClassInfo;
  settings: ClassSettings;
  boundaries: BoundariesFile;
  timezone: number;
}

export function buildView(input: ViewInput): OverlayView {
  const { tasks, ungraded, info, settings, boundaries, timezone } = input;
  const subject = info.level ? resolveSubject(boundaries, info.title, info.level, timezone) : undefined;
  const { categories, unassigned } = buildCategories(tasks, settings.weightings);
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

  if (subject && percent !== null) {
    grade = predictGrade(percent, subject.overall);
    next = pointsToNextGrade(subject.overall, percent);
    ticks = subject.overall.bands.slice(1).map((band, i) => ({
      grade: i + 2,
      at: (band[0] / subject.overall.max) * 100,
    }));
  }

  if (!info.level) note = "Could not read the level (SL or HL) from this page.";
  else if (!subject) note = "Could not match this class to an IB subject, so no grade is predicted.";
  else if (percent === null) note = "No graded tasks on this page yet.";

  const detail = subject
    ? subject.timezone === 0
      ? subject.level
      : `${subject.level} · Timezone ${subject.timezone}`
    : info.level;

  return {
    title: info.title || null,
    detail,
    boundariesLabel: `IB ${boundaries.label} boundaries`,
    percent,
    grade,
    next,
    ticks,
    rows,
    gradedCount: tasks.length,
    ungraded,
    unassigned,
    note,
  };
}