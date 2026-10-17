export type Band = [number, number];

export interface BandSet {
  max: number;
  bands: Band[];
}

export interface ComponentBounds extends BandSet {
  name: string;
}

export interface SubjectBounds {
  id: string;
  name: string;
  level: "SL" | "HL";
  timezone: number;
  overall: BandSet;
  components: ComponentBounds[];
}

export interface BoundariesFile {
  session: string;
  label: string;
  bandCount: number;
  subjects: SubjectBounds[];
}

export interface Task {
  score: number;
  max: number;
}

export interface Category {
  name: string;
  weight: number;
  tasks: Task[];
}

export type CategoryMethod = "average" | "points";