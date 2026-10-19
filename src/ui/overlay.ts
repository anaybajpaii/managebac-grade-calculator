import { START_COUNT } from "../engine/custom-bounds";
import { TIMEZONES } from "../storage/global";
import type { KeyValueStore } from "../storage/store";
import { parseForm, prettySubject, type EditorSave, type RawForm } from "./editor-form";
import { STYLES } from "./styles";
import type { EditorModel, OverlayView } from "./view-model";

const OPEN_KEY = "ui:open";

export interface OverlayHandlers {
  onSave?: (change: EditorSave) => Promise<void> | void;
  onReset?: () => Promise<void> | void;
}

export interface Overlay {
  update(view: OverlayView | null): void;
  destroy(): void;
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

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function renderTab(doc: Document, view: OverlayView, onOpen: () => void): HTMLElement {
  const label = el(doc, "span", "t");
  if (view.percent === null) {
    label.append(el(doc, "b", undefined, "No graded tasks"));
  } else {
    label.append(el(doc, "b", undefined, pct(view.percent)));
  }
  if (view.title) label.append(el(doc, "span", "s", view.title));
  const tab = el(doc, "button", "tab", el(doc, "span", "g", view.grade === null ? "–" : String(view.grade)), label);
  tab.type = "button";
  tab.setAttribute("aria-expanded", "false");
  tab.setAttribute("aria-label", "Open Grade Calculator");
  tab.addEventListener("click", onOpen);
  return tab;
}

function renderScale(doc: Document, view: OverlayView): HTMLElement | null {
  if (view.percent === null || view.ticks.length === 0) return null;
  const ruler = el(doc, "div", "ruler");
  const done = el(doc, "div", "done");
  done.style.width = `${Math.min(100, Math.max(0, view.percent))}%`;
  ruler.append(done);
  for (const tick of view.ticks) {
    const mark = el(doc, "i");
    mark.style.left = `${tick.at}%`;
    const label = el(doc, "em", undefined, String(tick.grade));
    label.style.left = `${tick.at}%`;
    ruler.append(mark, label);
  }
  const scale = el(doc, "div", "scale", ruler);
  if (view.next) {
    scale.append(el(doc, "div", "gap", `${view.next.needed.toFixed(1)} points short of a ${view.next.grade}`));
  }
  return scale;
}

function renderCategories(doc: Document, view: OverlayView): HTMLElement {
  const section = el(doc, "div", "sec", el(doc, "h3", undefined, "Categories"));
  for (const row of view.rows) {
    const line = el(
      doc,
      "div",
      row.percent === null ? "row none" : "row",
      el(doc, "span", "n", row.name),
      el(doc, "span", "lead"),
      el(doc, "span", "w", `${row.weight}%`),
      el(doc, "span", "p", row.percent === null ? "no grades" : pct(row.percent)),
    );
    section.append(line);
  }
  if (view.weightsFromPage) {
    section.append(el(doc, "div", "small", "Weights read from ManageBac"));
  }
  if (view.unassigned.length > 0) {
    section.append(el(doc, "div", "small", `Not weighted yet: ${view.unassigned.join(", ")}`));
  }
  if (view.ungraded > 0) {
    const noun = view.ungraded === 1 ? "task" : "tasks";
    section.append(el(doc, "div", "small", `${view.ungraded} ${noun} not counted (no points score)`));
  }
  return section;
}

function link(doc: Document, text: string, extra: string, onClick: () => void): HTMLButtonElement {
  const button = el(doc, "button", `link ${extra}`, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function renderPanel(doc: Document, view: OverlayView, onHide: () => void, onSettings: () => void): HTMLElement {
  const hide = link(doc, "hide", "hide", onHide);
  const settings = link(doc, "settings", "gear", onSettings);

  const headline =
    view.percent === null ? "No graded tasks" : `${pct(view.percent)} weighted`;
  const meta = el(doc, "div", "meta", el(doc, "b", undefined, headline));
  for (const line of [view.title, view.detail, view.boundariesLabel]) {
    if (line) meta.append(el(doc, "span", undefined, line));
  }

  const panel = el(
    doc,
    "div",
    "panel",
    el(doc, "div", "ph", el(doc, "b", undefined, "Grade Calculator"), el(doc, "span", "acts", settings, hide)),
    el(doc, "div", "hero", el(doc, "div", "big", view.grade === null ? "–" : String(view.grade)), meta),
  );
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Grade Calculator");

  const scale = renderScale(doc, view);
  if (scale) panel.append(scale);
  if (view.note) panel.append(el(doc, "div", "note", view.note));
  if (view.rows.length > 0) panel.append(renderCategories(doc, view));
  panel.append(el(doc, "div", "foot", "Everything stays in your browser."));
  return panel;
}

function labelled(doc: Document, text: string, control: HTMLElement, className = "field"): HTMLElement {
  return el(doc, "label", className, el(doc, "span", undefined, text), control);
}

function textInput(doc: Document, value: string, className: string, placeholder = ""): HTMLInputElement {
  const input = el(doc, "input", className);
  input.type = "text";
  input.value = value;
  input.placeholder = placeholder;
  input.spellcheck = false;
  return input;
}

function numberInput(doc: Document, value: string, className: string, placeholder = ""): HTMLInputElement {
  const input = el(doc, "input", className);
  input.type = "number";
  input.inputMode = "decimal";
  input.step = "any";
  input.min = "0";
  input.value = value;
  input.placeholder = placeholder;
  return input;
}

function dropdown(doc: Document, options: [string, string][], selected: string): HTMLSelectElement {
  const select = el(doc, "select");
  for (const [value, label] of options) {
    const option = el(doc, "option", undefined, label);
    option.value = value;
    select.append(option);
  }
  select.value = selected;
  return select;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function renderSettings(
  doc: Document,
  view: OverlayView,
  handlers: OverlayHandlers,
  onDone: () => void,
): HTMLElement {
  const model: EditorModel = view.editor;

  // Category weights
  const rows = el(doc, "div", "wrows");
  const total = el(doc, "div", "small");
  const rowInputs: { name: HTMLInputElement; weight: HTMLInputElement }[] = [];

  function updateTotal(): void {
    const sum = rowInputs.reduce((acc, r) => acc + (Number(r.weight.value.replace(",", ".")) || 0), 0);
    total.textContent =
      sum === 100 ? "Total 100%" : `Total ${formatNumber(sum)}% (weights are scaled to add up to 100%)`;
  }

  function addRow(name: string, weight: string): void {
    const nameInput = textInput(doc, name, "wname", "Category");
    const weightInput = numberInput(doc, weight, "wnum", "%");
    const remove = el(doc, "button", "x", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${name || "category"}`);
    const entry = { name: nameInput, weight: weightInput };
    rowInputs.push(entry);
    const line = el(doc, "div", "wrow", nameInput, weightInput, el(doc, "span", "pc", "%"), remove);
    remove.addEventListener("click", () => {
      rowInputs.splice(rowInputs.indexOf(entry), 1);
      line.remove();
      updateTotal();
      refreshChips();
    });
    weightInput.addEventListener("input", updateTotal);
    nameInput.addEventListener("input", refreshChips);
    rows.append(line);
  }

  const chips = el(doc, "div", "chips");
  function refreshChips(): void {
    chips.replaceChildren();
    const used = new Set(rowInputs.map((r) => r.name.value.trim().toLowerCase()));
    for (const name of model.pageCategories) {
      if (used.has(name.trim().toLowerCase())) continue;
      const chip = el(doc, "button", "chip", `+ ${name}`);
      chip.type = "button";
      chip.addEventListener("click", () => {
        addRow(name, "");
        updateTotal();
        refreshChips();
        rowInputs[rowInputs.length - 1]?.weight.focus();
      });
      chips.append(chip);
    }
  }

  function setRows(list: { name: string; weight: number }[]): void {
    rows.replaceChildren();
    rowInputs.length = 0;
    for (const w of list) addRow(w.name, formatNumber(w.weight));
    updateTotal();
    refreshChips();
  }
  setRows(model.weightings);

  const usePage = el(doc, "input");
  usePage.type = "checkbox";
  usePage.checked = model.usePageWeights;
  const pageToggle = model.pageWeights
    ? el(doc, "label", "check", usePage, el(doc, "span", undefined, "Use the weights shown on ManageBac"))
    : null;
  const weightBox = el(doc, "div", "wbox");
  function syncWeights(): void {
    const locked = usePage.checked && model.pageWeights !== null;
    weightBox.classList.toggle("locked", locked);
    for (const r of rowInputs) {
      r.name.disabled = locked;
      r.weight.disabled = locked;
    }
  }
  usePage.addEventListener("change", () => {
    if (usePage.checked && model.pageWeights) setRows(model.pageWeights);
    syncWeights();
  });

  const addButton = el(doc, "button", "chip", "+ Add category");
  addButton.type = "button";
  addButton.addEventListener("click", () => {
    addRow("", "");
    updateTotal();
    rowInputs[rowInputs.length - 1]?.name.focus();
  });

  // Counting method
  const method = dropdown(
    doc,
    [
      ["average", "Average of each task's percentage"],
      ["points", "Total points earned ÷ total points available"],
    ],
    model.method,
  );

  // Subject, level, timezone
  const autoLabel = view.title ? `Detected: ${view.title}` : "Detected from the page";
  const subject = dropdown(
    doc,
    [["", autoLabel], ...model.subjectNames.map((n): [string, string] => [n, prettySubject(n)])],
    model.subjectName ?? "",
  );
  const level = dropdown(
    doc,
    [
      ["", "Detected from the page"],
      ["SL", "SL"],
      ["HL", "HL"],
    ],
    model.level ?? "",
  );
  const timezone = dropdown(
    doc,
    TIMEZONES.map((z): [string, string] => [String(z), `Timezone ${z}`]),
    String(model.timezone),
  );

  // Own boundaries
  const useCustom = el(doc, "input");
  useCustom.type = "checkbox";
  useCustom.checked = model.customStarts !== null;
  const startInputs: HTMLInputElement[] = [];
  const grid = el(doc, "div", "starts");
  for (let i = 0; i < START_COUNT; i++) {
    const preset = model.customStarts?.[i];
    const official = model.officialStarts?.[i];
    const input = numberInput(
      doc,
      preset === undefined ? "" : formatNumber(preset),
      "snum",
      official === undefined ? "%" : formatNumber(official),
    );
    startInputs.push(input);
    grid.append(labelled(doc, `Grade ${i + 2}`, input, "start"));
  }
  const custom = el(
    doc,
    "div",
    "custom",
    el(doc, "div", "small", "Minimum overall percentage needed for each grade."),
    grid,
  );
  function syncCustom(): void {
    custom.style.display = useCustom.checked ? "" : "none";
  }
  useCustom.addEventListener("change", syncCustom);
  syncCustom();

  const error = el(doc, "div", "err");
  error.setAttribute("role", "alert");

  function readForm(): RawForm {
    return {
      weightings: rowInputs.map((r) => ({ name: r.name.value, weight: r.weight.value })),
      usePage: usePage.checked && model.pageWeights !== null,
      method: method.value,
      subjectName: subject.value,
      level: level.value,
      timezone: timezone.value,
      useCustom: useCustom.checked,
      starts: startInputs.map((i) => i.value),
    };
  }

  const save = el(doc, "button", "btn primary", "Save");
  save.type = "button";
  save.addEventListener("click", () => {
    const result = parseForm(readForm());
    if (!result.ok) {
      error.textContent = result.error;
      return;
    }
    error.textContent = "";
    save.disabled = true;
    Promise.resolve(handlers.onSave?.(result.value))
      .then(onDone)
      .catch(() => {
        save.disabled = false;
        error.textContent = "Could not save. Try again.";
      });
  });

  const cancel = el(doc, "button", "btn", "Cancel");
  cancel.type = "button";
  cancel.addEventListener("click", onDone);

  const reset = el(doc, "button", "link reset", "Reset this class");
  reset.type = "button";
  let armed = false;
  reset.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      reset.textContent = "Click again to reset";
      return;
    }
    Promise.resolve(handlers.onReset?.())
      .then(onDone)
      .catch(() => {
        error.textContent = "Could not reset. Try again.";
      });
  });

  weightBox.append(
    rows,
    total,
    chips,
    el(doc, "div", "adds", addButton),
    el(doc, "div", "small", 'A single row named "All tasks" counts every task equally.'),
  );
  syncWeights();

  const back = link(doc, "back", "back", onDone);
  const form = el(
    doc,
    "div",
    "form",
    el(
      doc,
      "div",
      "sec",
      el(doc, "h3", undefined, "Category weights"),
      ...(pageToggle ? [pageToggle] : []),
      weightBox,
    ),
    el(doc, "div", "sec", el(doc, "h3", undefined, "Counting"), method),
    el(
      doc,
      "div",
      "sec",
      el(doc, "h3", undefined, "Subject"),
      labelled(doc, "Subject", subject),
      labelled(doc, "Level", level),
      labelled(doc, "Exam timezone (all classes)", timezone),
    ),
    el(
      doc,
      "div",
      "sec",
      el(doc, "h3", undefined, "Grade boundaries"),
      el(doc, "label", "check", useCustom, el(doc, "span", undefined, "Use my own boundaries")),
      custom,
    ),
    el(doc, "div", "sec actions", error, el(doc, "div", "btns", save, cancel), reset),
  );

  const panel = el(
    doc,
    "div",
    "panel",
    el(doc, "div", "ph", el(doc, "b", undefined, "Settings"), el(doc, "span", "acts", back)),
    form,
  );
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Grade Calculator settings");
  panel.addEventListener("keydown", (event) => event.stopPropagation());
  panel.addEventListener("keyup", (event) => event.stopPropagation());
  panel.addEventListener("keypress", (event) => event.stopPropagation());
  return panel;
}

export function mountOverlay(doc: Document, store?: KeyValueStore, handlers: OverlayHandlers = {}): Overlay {
  const host = doc.createElement("div");
  host.setAttribute("data-grade-calculator", "");
  const shadow = host.attachShadow({ mode: "open" });
  doc.body.append(host);

  let open = false;
  let editing = false;
  let current: OverlayView | null = null;
  let lastKey = "";

  function draw(): void {
    shadow.replaceChildren();
    if (!current) {
      host.style.display = "none";
      return;
    }
    host.style.display = "";
    const style = doc.createElement("style");
    style.textContent = STYLES;
    const root = el(doc, "div", "root");
    if (open && editing) {
      root.append(renderSettings(doc, current, handlers, () => setEditing(false)));
    } else if (open) {
      root.append(renderPanel(doc, current, () => setOpen(false), () => setEditing(true)));
    } else {
      root.append(renderTab(doc, current, () => setOpen(true)));
    }
    shadow.append(style, root);
  }

  function setEditing(next: boolean): void {
    editing = next;
    draw();
  }

  function setOpen(next: boolean): void {
    open = next;
    if (!next) editing = false;
    store?.set(OPEN_KEY, next).catch(() => undefined);
    draw();
  }

  store
    ?.get(OPEN_KEY)
    .then((saved) => {
      if (typeof saved === "boolean" && saved !== open) {
        open = saved;
        draw();
      }
    })
    .catch(() => undefined);

  return {
    update(view) {
      if (!host.isConnected) doc.body.append(host);
      const key = JSON.stringify(view);
      if (key === lastKey) return;
      lastKey = key;
      current = view;
      // Redrawing would wipe what the user is typing in settings.
      if (editing && view) return;
      draw();
    },
    destroy() {
      host.remove();
    },
  };
}