import { percentNeeded, predictWithTasks, type PlannedTask, type WhatIfModel } from "../engine/whatif";

export interface WhatIfRow {
  category: string;
  max: string;
  score: string;
}

export interface WhatIfState {
  rows: WhatIfRow[];
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

function newRow(model: WhatIfModel, previous?: WhatIfRow): WhatIfRow {
  const first = model.categories.find((c) => c.weight > 0);
  const last = first?.tasks[first.tasks.length - 1];
  return {
    category: previous?.category ?? first?.name ?? "",
    max: previous?.max ?? (last ? fmt(last.max) : "100"),
    score: "",
  };
}

export function initialWhatIfState(model: WhatIfModel, nextGrade: number | null): WhatIfState {
  const maxGrade = model.overall.bands.length;
  return { rows: [newRow(model)], target: String(Math.min(maxGrade, nextGrade ?? maxGrade)) };
}

export function whatIfStateFits(model: WhatIfModel, state: WhatIfState): boolean {
  return (
    state.rows.length > 0 &&
    state.rows.every((r) =>
      model.categories.some((c) => c.weight > 0 && c.name.trim().toLowerCase() === r.category.trim().toLowerCase()),
    )
  );
}

export function renderWhatIf(
  doc: Document,
  model: WhatIfModel,
  currentPercent: number | null,
  state: WhatIfState,
): HTMLElement {
  const weighted = model.categories.filter((c) => c.weight > 0);
  const list = el(doc, "div", "wilist");
  const ifResult = el(doc, "div", "wires");
  const needResult = el(doc, "div", "wires");

  const target = el(doc, "select");
  for (let grade = 2; grade <= model.overall.bands.length; grade++) {
    const option = el(doc, "option", undefined, String(grade));
    option.value = String(grade);
    target.append(option);
  }
  target.value = state.target;
  target.setAttribute("aria-label", "Target grade");

  function update(): void {
    state.target = target.value;
    const planned: PlannedTask[] = [];
    const problems: string[] = [];
    state.rows.forEach((row, i) => {
      const max = num(row.max);
      const score = row.score.trim() === "" ? null : num(row.score);
      if (!(max > 0)) problems.push(`Task ${i + 1}: enter what it is out of.`);
      else if (score !== null && !(score >= 0)) problems.push(`Task ${i + 1}: check the score.`);
      else if (score !== null && score > max) problems.push(`Task ${i + 1}: the score cannot be higher than what it is out of.`);
      else planned.push({ category: row.category, max, score });
    });

    const scored = planned.filter((t) => t.score !== null);
    if (problems.length > 0) {
      ifResult.textContent = problems[0] ?? "";
    } else if (scored.length === 0) {
      ifResult.textContent = "Enter a score to see the new grade.";
    } else {
      const result = predictWithTasks(
        model,
        scored.map((t) => ({ category: t.category, max: t.max, score: t.score ?? 0 })),
      );
      if (!result) {
        ifResult.textContent = "One of these categories has no weight.";
      } else {
        const diff = currentPercent === null ? null : result.percent - currentPercent;
        const change = diff === null ? "" : ` (${diff >= 0 ? "+" : ""}${diff.toFixed(1)})`;
        const count = scored.length === 1 ? "" : ` with ${scored.length} tasks`;
        ifResult.textContent = `Overall ${result.percent.toFixed(1)}%${change}, grade ${result.grade}${count}`;
      }
    }

    if (problems.length > 0) {
      needResult.textContent = "";
    } else if (!planned.some((t) => t.score === null)) {
      needResult.textContent = "Leave a score blank on a task to see what it needs.";
    } else {
      const need = percentNeeded(model, planned, Number(target.value));
      if (!need) needResult.textContent = "Check what each task is out of.";
      else if (need.kind === "noweight") needResult.textContent = "One of these categories has no weight.";
      else if (need.kind === "any") needResult.textContent = `Any score keeps you at a ${target.value} or above.`;
      else if (need.kind === "unreachable") {
        needResult.textContent = `Not possible with these tasks. Full marks only reaches a ${need.bestGrade}.`;
      } else {
        const unknown = planned.filter((t) => t.score === null);
        const each = unknown.map((t, i) => `${fmt(need.scores[i] ?? 0)} / ${fmt(t.max)}`).join(", ");
        const pace = unknown.length === 1 ? "" : " on each";
        needResult.textContent = `You need ${fmt(need.percent)}%${pace}: ${each}`;
      }
    }
  }

  function drawRows(): void {
    list.replaceChildren();
    state.rows.forEach((row, i) => {
      const category = el(doc, "select");
      for (const c of weighted) {
        const option = el(doc, "option", undefined, c.name);
        option.value = c.name;
        category.append(option);
      }
      category.value = row.category;
      category.setAttribute("aria-label", `Category of task ${i + 1}`);

      const score = el(doc, "input", "wnum");
      score.type = "number";
      score.min = "0";
      score.step = "any";
      score.value = row.score;
      score.placeholder = "?";
      score.setAttribute("aria-label", `Score on task ${i + 1}, blank to work it out`);

      const max = el(doc, "input", "wnum");
      max.type = "number";
      max.min = "0";
      max.step = "any";
      max.value = row.max;
      max.setAttribute("aria-label", `Task ${i + 1} is out of`);

      const remove = el(doc, "button", "x", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove task ${i + 1}`);
      remove.disabled = state.rows.length === 1;
      remove.addEventListener("click", () => {
        state.rows.splice(i, 1);
        drawRows();
        update();
      });

      const sync = (): void => {
        row.category = category.value;
        row.score = score.value;
        row.max = max.value;
        update();
      };
      for (const control of [category, score, max]) {
        control.addEventListener("input", sync);
        control.addEventListener("change", sync);
      }
      list.append(el(doc, "div", "wirow", category, score, el(doc, "span", "pc", "/"), max, remove));
    });
  }

  const add = el(doc, "button", "chip", "+ Add task");
  add.type = "button";
  add.addEventListener("click", () => {
    state.rows.push(newRow(model, state.rows[state.rows.length - 1]));
    drawRows();
    update();
    const inputs = list.querySelectorAll("input");
    (inputs[inputs.length - 2] as HTMLInputElement | undefined)?.focus();
  });

  target.addEventListener("input", update);
  target.addEventListener("change", update);
  drawRows();
  update();

  return el(
    doc,
    "div",
    "sec wi",
    el(doc, "h3", undefined, "What if"),
    el(doc, "div", "small", "Add tasks you expect. Leave a score blank to work out what it needs."),
    list,
    el(doc, "div", "adds", add),
    ifResult,
    el(doc, "div", "wirow target", el(doc, "span", undefined, "To reach a"), target),
    needResult,
  );
}
