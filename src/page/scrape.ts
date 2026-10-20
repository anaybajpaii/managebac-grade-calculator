import type { ClassInfo, PageWeight, ScrapedTask, ScrapedTasks } from "./types";

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
    // ManageBac shows the type first and the task category second. The category can have the same
    // name as the type (a "Formative" category on a Formative task), so do not filter it out.
    const category = labels[1] ?? labels[0] ?? UNCATEGORISED;
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

const PERCENT_ONLY = /^\s*(\d+(?:[.,]\d+)?)\s*%\s*$/;
const HEADING = /^task categories$/i;
const HEADING_TAGS = "h1, h2, h3, h4, h5, h6, div, span, p, strong, b, th, button, a, legend";

function isLeaf(node: Element): boolean {
  return node.children.length === 0;
}

function findHeading(root: ParentNode): Element | null {
  let found: Element | null = null;
  for (const node of root.querySelectorAll(HEADING_TAGS)) {
    if (!HEADING.test(clean(node.textContent))) continue;
    // Keep the deepest match: the one with no child carrying the same text.
    found = node;
  }
  return found;
}

function percentLeaves(container: Element): Element[] {
  return [...container.querySelectorAll("*")].filter((node) => isLeaf(node) && PERCENT_ONLY.test(clean(node.textContent)));
}

/**
 * Reads the "Task Categories" box ManageBac shows next to the tasks (category name and its
 * weight). Works by looking for the heading text and then for "NN%" cells, so it does not
 * depend on ManageBac's class names.
 */
export function scrapeWeights(root: ParentNode): PageWeight[] | null {
  const heading = findHeading(root);
  if (!heading) return null;

  let container: Element | null = heading;
  for (let depth = 0; depth < 6 && container; depth++) {
    container = container.parentElement;
    if (container && percentLeaves(container).length > 0) break;
  }
  if (!container) return null;
  const box = container;

  const result: PageWeight[] = [];
  const seen = new Set<string>();
  for (const leaf of percentLeaves(box)) {
    const percentText = clean(leaf.textContent);
    let name = "";
    for (let row: Element | null = leaf.parentElement; row && box.contains(row); row = row.parentElement) {
      if (percentLeaves(row).length !== 1) break;
      const residue = clean(row.textContent).replace(percentText, "").trim();
      if (residue !== "") {
        name = residue;
        break;
      }
    }
    if (name === "") name = clean(leaf.previousElementSibling?.textContent);
    if (name === "" || HEADING.test(name)) continue;
    const weight = toNumber((PERCENT_ONLY.exec(percentText)?.[1] ?? "").trim());
    if (!Number.isFinite(weight)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name, weight });
  }
  return result.length > 0 ? result : null;
}
