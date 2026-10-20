import type { CategoryMethod } from "../engine/types";

export interface Weighting {
  name: string;
  weight: number;
}

export interface ClassSettings {
  version: 1;
  weightings: Weighting[];
  method: CategoryMethod;
  /** "page": use the weights ManageBac shows for the class. "custom": use `weightings`. Absent: automatic. */
  weightSource?: "page" | "custom";
  /** Extra categories counted on top of ManageBac's own weights (e.g. formative tasks). */
  extraWeightings?: Weighting[];
  /** Overrides the subject read from the page (an IB subject name from the boundaries file). */
  subjectName?: string;
  /** Overrides the level read from the page. */
  level?: "SL" | "HL";
  /** Own boundaries: minimum overall % for grades 2 to 7. Replaces the IB ones. */
  customStarts?: number[];
}

export interface GlobalSettings {
  version: 1;
  timezone: number;
}
