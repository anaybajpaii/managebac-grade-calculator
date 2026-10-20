export interface ScrapedTask {
  title: string;
  type: string | null;
  category: string;
  labels: string[];
  score: number;
  max: number;
}

export interface ScrapedTasks {
  tasks: ScrapedTask[];
  ungraded: number;
}

export interface ClassInfo {
  title: string;
  level: "SL" | "HL" | null;
}

export interface PageWeight {
  name: string;
  weight: number;
}
