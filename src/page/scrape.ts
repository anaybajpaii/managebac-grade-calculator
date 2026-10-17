import type { ClassInfo, ScrapedTask, ScrapedTasks } from "./types";

const POINTS = /^\s*(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(?:pts?|points?)?\s*$/i;
const TYPE_LABEL = /^(summative|formative)$/i;
const UNCATEGORISED = "Uncategorised";

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(text: string): number {
  return Number(text.replace(",", "."));
}

export function parsePoints(text: string): { score: number; max: number } | null {
  const match = text.match(POINTS);
  if (!match) return null;
  const score = toNumber(match[1] ?? "");
  const max = toNumber(match[2] ?? "");
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return null;
  return { score, max };
}

export function scrapeTasks(root: ParentNode): ScrapedTasks {
  const tasks: ScrapedTask[] = [];
  let ungraded = 0;
  for (const card of root.querySelectorAll(".fusion-card-item.short-assignment")) {
    const title = clean(card.querySelector(".title a")?.textContent ?? card.querySelector(".title")?.textContent);
    const points = parsePoints(clean(card.querySelector(".task-score .points")?.textContent));
    if (!points) {
      ungraded++;
      continue;
    }
    const labels = [...card.querySelectorAll(".label-and-due .label")].map((el) => clean(el.textContent)).filter(Boolean);
    const type = labels.find((label) => TYPE_LABEL.test(label)) ?? null;
    const category = labels.find((label) => !TYPE_LABEL.test(label)) ?? UNCATEGORISED;
    tasks.push({ title, type, category, labels, score: points.score, max: points.max });
  }
  return { tasks, ungraded };
}

export function scrapeClassInfo(doc: ParentNode): ClassInfo {
  const title = clean(doc.querySelector(".f-hero__title")?.textContent);
  let level: ClassInfo["level"] = null;
  for (const badge of doc.querySelectorAll(".f-hero .badge-label")) {
    const text = clean(badge.textContent).toUpperCase();
    if (text === "HL" || text === "SL") {
      level = text;
      break;
    }
  }
  return { title, level };
}