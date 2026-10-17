import type { CategoryMethod } from "../engine/types";

export interface Weighting {
  name: string;
  weight: number;
}

export interface ClassSettings {
  version: 1;
  weightings: Weighting[];
  method: CategoryMethod;
}