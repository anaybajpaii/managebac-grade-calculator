import { predictWith, scoreNeeded, type WhatIfModel } from "../engine/whatif";

export interface WhatIfState {
  category: string;
  max: string;
  score: string;
  target: string;
}

type Child = Node | string;

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function num(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** Picks sensible starting values the first time the section is shown. */
export function initialWhatIfState(model: WhatIfModel, nextGrade: number | null): WhatIfState {
  const first = model.categories.find((c) => c.weight > 0);
  const lastTask = first?.tasks[first.tasks.length - 1];
  const maxGrade = model.overall.bands.length;
  return {
    category: first?.name ?? "",
    max: lastTask ? fmt(lastTask.max) : "100",
    score: "",
    target: String(Math.min(maxGrade, nextGrade ?? maxGrade)),
  };
}

export function renderWhatIf(
  doc: Document,
  model: WhatIfModel,
  currentPercent: number | null,
  state: WhatIfState,
): HTMLElement {
  const weighted = model.categories.filter((c) => c.weight > 0);

  const category = el(doc, "select");
  for (const c of weighted) {
    const option = el(doc, "option", undefined, c.name);
    option.value = c.name;
    category.append(option);
  }
  category.value = state.category;
  category.setAttribute("aria-label", "Category of the new task");

  const max = el(doc, "input", "wnum");
  max.type = "number";
  max.min = "0";
  max.step = "any";
  max.value = state.max;
  max.setAttribute("aria-label", "Task is out of");

  const score = el(doc, "input", "wnum");
  score.type = "number";
  score.min = "0";
  score.step = "any";
  score.value = state.score;
  score.placeholder = "score";
  score.setAttribute("aria-label", "Score on the new task");

  const target = el(doc, "select");
  for (let grade = 2; grade <= model.overall.bands.length; grade++) {
    const option = el(doc, "option", undefined, String(grade));
    option.value = String(grade);
    target.append(option);
  }
  target.value = state.target;
  target.setAttribute("aria-label", "Target grade");

  const ifResult = el(doc, "div", "wires");
  const needResult = el(doc, "div", "wires");

  function update(): void {
    state.category = category.value;
    state.max = max.value;
    state.score = score.value;
    state.target = target.value;

    const maxValue = num(max.value);
    const scoreValue = num(score.value);
    if (score.value.trim() === "") {
      ifResult.textContent = "Enter a score to see the new grade.";
    } else {
      const result = scoreValue > maxValue ? null : predictWith(model, category.value, scoreValue, maxValue);
      if (scoreValue > maxValue) {
        ifResult.textContent = "The score cannot be higher than what the task is out of.";
      } else if (!result) {
        ifResult.textContent = "Check the score and what the task is out of.";
      } else {
        const change = currentPercent === null ? "" : ` (${result.percent - currentPercent >= 0 ? "+" : ""}${(result.percent - currentPercent).toFixed(1)})`;
        ifResult.textContent = `Overall ${result.percent.toFixed(1)}%${change}, grade ${result.grade}`;
      }
    }

    const need = scoreNeeded(model, category.value, maxValue, Number(target.value));
    if (!need) needResult.textContent = "Check what the task is out of.";
    else if (need.kind === "noweight") needResult.textContent = "This category has no weight.";
    else if (need.kind === "any") needResult.textContent = `Any score keeps you at a ${target.value} or above.`;
    else if (need.kind === "unreachable") {
      needResult.textContent = `Not possible with one more task here. Full marks only reaches a ${need.bestGrade}.`;
    } else {
      needResult.textContent = `You need ${fmt(need.score)} / ${fmt(maxValue)} (${fmt((need.score / maxValue) * 100)}%)`;
    }
  }
  for (const control of [category, max, score, target]) {
    control.addEventListener("input", update);
    control.addEventListener("change", update);
  }
  update();

  return el(
    doc,
    "div",
    "sec wi",
    el(doc, "h3", undefined, "What if"),
    el(doc, "div", "wirow", el(doc, "span", undefined, "A new task in"), category),
    el(doc, "div", "wirow", el(doc, "span", undefined, "out of"), max),
    el(doc, "div", "wirow", el(doc, "span", undefined, "If I score"), score),
    ifResult,
    el(doc, "div", "wirow", el(doc, "span", undefined, "To reach a"), target),
    needResult,
  );
}
