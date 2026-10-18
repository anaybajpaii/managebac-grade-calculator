import type { KeyValueStore } from "../storage/store";
import { STYLES } from "./styles";
import type { OverlayView } from "./view-model";

const OPEN_KEY = "ui:open";

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
  if (view.unassigned.length > 0) {
    section.append(el(doc, "div", "small", `Not weighted yet: ${view.unassigned.join(", ")}`));
  }
  if (view.ungraded > 0) {
    const noun = view.ungraded === 1 ? "task" : "tasks";
    section.append(el(doc, "div", "small", `${view.ungraded} ${noun} not counted (no points score)`));
  }
  return section;
}

function renderPanel(doc: Document, view: OverlayView, onHide: () => void): HTMLElement {
  const hide = el(doc, "button", "link", "hide");
  hide.type = "button";
  hide.addEventListener("click", onHide);

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
    el(doc, "div", "ph", el(doc, "b", undefined, "Grade Calculator"), hide),
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

export function mountOverlay(doc: Document, store?: KeyValueStore): Overlay {
  const host = doc.createElement("div");
  host.setAttribute("data-grade-calculator", "");
  const shadow = host.attachShadow({ mode: "open" });
  doc.body.append(host);

  let open = false;
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
    root.append(open ? renderPanel(doc, current, () => setOpen(false)) : renderTab(doc, current, () => setOpen(true)));
    shadow.append(style, root);
  }

  function setOpen(next: boolean): void {
    open = next;
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
      draw();
    },
    destroy() {
      host.remove();
    },
  };
}