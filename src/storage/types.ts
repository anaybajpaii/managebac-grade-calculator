import type { ModeId, ToneId } from "../appearance";
import type { CategoryMethod } from "../engine/types";

export interface Weighting {
  name: string;
  weight: number;
}

export interface ClassSettings {
  version: 1;
  weightings: Weighting[];
  method: CategoryMethod;
  weightSource?: "page" | "custom";
  extraWeightings?: Weighting[];
  subjectName?: string;
  level?: "SL" | "HL";
  customStarts?: number[];
}

export interface GlobalSettings {
  version: 1;
  timezone: number;
  tone: ToneId;
  mode: ModeId;
}
